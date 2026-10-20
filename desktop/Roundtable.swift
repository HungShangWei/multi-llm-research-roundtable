import AppKit
import WebKit
import UniformTypeIdentifiers
import Darwin

final class RoundtableApp: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, WKDownloadDelegate {
    var window: NSWindow!
    var web: WKWebView!
    var loading: NSView!
    var server: Process?
    var logHandle: FileHandle?
    var terminating = false
    var startupAttempt = 0
    var lockFD: Int32 = -1
    var downloads: [ObjectIdentifier: (URL, URL)] = [:]
    let port = 4318
    let fm = FileManager.default
    lazy var support = fm.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/Roundtable", isDirectory: true)
    lazy var baseURL = URL(string: "http://127.0.0.1:\(port)/")!
    lazy var resources = Bundle.main.resourceURL!
    var isEnglish: Bool { UserDefaults.standard.string(forKey: "interfaceLanguage") == "en" }
    func text(_ zh: String, _ en: String) -> String { isEnglish ? en : zh }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        makeMenus()
        makeWindow()
        do {
            try fm.createDirectory(at: support, withIntermediateDirectories: true)
            lockFD = Darwin.open(support.appendingPathComponent("desktop.lock").path, O_CREAT | O_RDWR | O_CLOEXEC, S_IRUSR | S_IWUSR)
            guard lockFD >= 0, flock(lockFD, LOCK_EX | LOCK_NB) == 0 else {
                let others = NSRunningApplication.runningApplications(withBundleIdentifier: "local.roundtable.desktop").filter { $0.processIdentifier != getpid() }
                others.first?.activate(options: [])
                NSApp.terminate(nil)
                return
            }
            checkExistingService()
        } catch { showError(error.localizedDescription) }
    }

    func makeMenus() {
        let menu = NSMenu()
        let appItem = NSMenuItem(); menu.addItem(appItem)
        let appMenu = NSMenu(); appItem.submenu = appMenu
        appMenu.addItem(withTitle: "關於研究圓桌 / About Roundtable", action: #selector(showAbout), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "隱藏 / Hide", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(withTitle: "結束研究圓桌 / Quit", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        let fileItem = NSMenuItem(); menu.addItem(fileItem)
        let file = NSMenu(title: "檔案 / File"); fileItem.submenu = file
        file.addItem(withTitle: "新研究 / New Research", action: #selector(newResearch), keyEquivalent: "n")
        file.addItem(withTitle: "重新載入 / Reload", action: #selector(reload), keyEquivalent: "r")
        file.addItem(.separator())
        file.addItem(withTitle: "顯示資料資料夾 / Show Data Folder", action: #selector(showData), keyEquivalent: "")
        let editItem = NSMenuItem(); menu.addItem(editItem)
        let edit = NSMenu(title: "編輯 / Edit"); editItem.submenu = edit
        for (title, action, key) in [("復原 / Undo", "undo:", "z"), ("剪下 / Cut", "cut:", "x"), ("複製 / Copy", "copy:", "c"), ("貼上 / Paste", "paste:", "v"), ("全選 / Select All", "selectAll:", "a")] {
            edit.addItem(withTitle: title, action: Selector(action), keyEquivalent: key)
        }
        let windowItem = NSMenuItem(); menu.addItem(windowItem)
        let windows = NSMenu(title: "視窗 / Window"); windowItem.submenu = windows
        windows.addItem(withTitle: "縮到 Dock / Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        windows.addItem(withTitle: "縮放 / Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
        NSApp.windowsMenu = windows
        NSApp.mainMenu = menu
    }

    func makeWindow() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        config.userContentController.add(self, name: "roundtable")
        // Only app UI language metadata crosses this bridge; user content is never executed.
        let languageScript = "new MutationObserver(()=>window.webkit.messageHandlers.roundtable.postMessage({action:'language',value:document.documentElement.lang})).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});"
        config.userContentController.addUserScript(WKUserScript(source: languageScript, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self; web.uiDelegate = self
        web.autoresizingMask = [.width, .height]
        web.allowsBackForwardNavigationGestures = false
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1240, height: 850), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "研究圓桌 · Roundtable"
        window.minSize = NSSize(width: 850, height: 620)
        window.setFrameAutosaveName("RoundtableMainWindow")
        window.isReleasedWhenClosed = false
        window.contentView = web
        window.center()
        loading = NSView(frame: web.bounds); loading.autoresizingMask = [.width, .height]
        loading.wantsLayer = true; loading.layer?.backgroundColor = NSColor(calibratedRed: 0.95, green: 0.97, blue: 0.99, alpha: 1).cgColor
        let label = NSTextField(labelWithString: "研究圓桌 · Roundtable\n正在開啟你的研究工作區…")
        label.font = .systemFont(ofSize: 22, weight: .medium); label.alignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        let spinner = NSProgressIndicator(); spinner.style = .spinning; spinner.startAnimation(nil); spinner.translatesAutoresizingMaskIntoConstraints = false
        loading.addSubview(label); loading.addSubview(spinner); web.addSubview(loading)
        NSLayoutConstraint.activate([label.centerXAnchor.constraint(equalTo: loading.centerXAnchor),label.centerYAnchor.constraint(equalTo: loading.centerYAnchor),spinner.centerXAnchor.constraint(equalTo: loading.centerXAnchor),spinner.topAnchor.constraint(equalTo: label.bottomAnchor,constant: 22)])
        window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
    }

    func checkExistingService() {
        var req = URLRequest(url: baseURL.appendingPathComponent("api/bootstrap")); req.timeoutInterval = 2
        URLSession.shared.dataTask(with: req) { data, response, error in
            DispatchQueue.main.async {
                if error != nil { self.startService(); return }
                if let data = data, let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let service = json["service"] as? [String: Any], service["id"] as? String == "local.roundtable", service["storage"] as? String == "desktop" {
                    self.web.load(URLRequest(url: self.baseURL)); return
                }
                self.showError("連接埠 4318 已被另一個本機服務使用。請先關閉先前的網頁版服務，再重新開啟研究圓桌。\nPort 4318 is already in use. Close the earlier web service, then reopen Roundtable.")
            }
        }.resume()
    }

    func prepareData() throws {
        let tools = support.appendingPathComponent("Tools", isDirectory: true)
        try fm.createDirectory(at: tools, withIntermediateDirectories: true)
        let agy = tools.appendingPathComponent("agy")
        if !fm.fileExists(atPath: agy.path) {
            try fm.copyItem(at: resources.appendingPathComponent("Tools/agy"), to: agy)
            try fm.setAttributes([.posixPermissions: 0o755], ofItemAtPath: agy.path)
        }
        let sessions = support.appendingPathComponent("sessions", isDirectory: true)
        try fm.createDirectory(at: sessions, withIntermediateDirectories: true)
        let marker = support.appendingPathComponent("migration-v1.json")
        if !fm.fileExists(atPath: marker.path) {
            let configURL = resources.appendingPathComponent("desktop-config.json")
            let config = try JSONSerialization.jsonObject(with: Data(contentsOf: configURL)) as? [String: Any]
            let legacy = URL(fileURLWithPath: config?["legacySessions"] as? String ?? "")
            let files = (try? fm.contentsOfDirectory(at: legacy, includingPropertiesForKeys: nil)) ?? []
            var copied = [String]()
            for source in files where source.pathExtension == "json" {
                let destination = sessions.appendingPathComponent(source.lastPathComponent)
                if fm.fileExists(atPath: destination.path) { continue }
                var data = try Data(contentsOf: source)
                if source.lastPathComponent != "settings.json", var session = try JSONSerialization.jsonObject(with: data) as? [String: Any], var snapshots = session["modelSnapshot"] as? [String: Any], var google = snapshots["antigravity"] as? [String: Any] {
                    if let old = google["binary"] as? String { google["migratedFromBinary"] = old }
                    google["binary"] = agy.path; snapshots["antigravity"] = google; session["modelSnapshot"] = snapshots
                    session["desktopMigration"] = ["date": ISO8601DateFormatter().string(from: Date()), "source": source.path, "note": "Responses preserved. Official Google CLI path relocated to stable app data folder."]
                    data = try JSONSerialization.data(withJSONObject: session, options: [.prettyPrinted, .sortedKeys])
                }
                try data.write(to: destination, options: .atomic)
                try fm.setAttributes([.posixPermissions: 0o600], ofItemAtPath: destination.path)
                copied.append(source.lastPathComponent)
            }
            let record: [String: Any] = ["date": ISO8601DateFormatter().string(from: Date()), "copied": copied, "source": legacy.path]
            try JSONSerialization.data(withJSONObject: record, options: [.prettyPrinted]).write(to: marker, options: .atomic)
        }
    }

    func startService() {
        do {
            try prepareData()
            let logs = support.appendingPathComponent("Logs", isDirectory: true)
            try fm.createDirectory(at: logs, withIntermediateDirectories: true)
            let log = logs.appendingPathComponent("desktop.log")
            if !fm.fileExists(atPath: log.path) { fm.createFile(atPath: log.path, contents: nil) }
            logHandle = try FileHandle(forWritingTo: log); try logHandle?.truncate(atOffset: 0)
            let process = Process()
            process.executableURL = resources.appendingPathComponent("Runtime/node")
            process.arguments = [resources.appendingPathComponent("Web/server.mjs").path]
            process.currentDirectoryURL = support
            var env = ProcessInfo.processInfo.environment
            let userHome = fm.homeDirectoryForCurrentUser.path
            env["PATH"] = userHome + "/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
            env["ROUNDTABLE_DATA_DIR"] = support.appendingPathComponent("sessions").path
            env["ROUNDTABLE_RUNTIME_DIR"] = support.appendingPathComponent("RuntimeWork").path
            env["ROUNDTABLE_AGY_PATH"] = support.appendingPathComponent("Tools/agy").path
            env["ROUNDTABLE_PORT"] = String(port); env["ROUNDTABLE_DESKTOP"] = "1"
            process.environment = env; process.standardOutput = logHandle; process.standardError = logHandle
            process.terminationHandler = { process in
                DispatchQueue.main.async {
                    if self.terminating { NSApp.reply(toApplicationShouldTerminate: true) }
                    else { self.showError("本機研究服務已停止。請重新開啟 App。\nThe local service stopped. Reopen the app.\n\n" + String((try? String(contentsOf: log, encoding: .utf8))?.suffix(1200) ?? "")) }
                }
            }
            try process.run(); server = process
            waitForService()
        } catch { showError(error.localizedDescription) }
    }

    func waitForService() {
        guard !terminating, server?.isRunning == true else { return }
        startupAttempt += 1
        var req = URLRequest(url: baseURL.appendingPathComponent("api/bootstrap")); req.timeoutInterval = 1
        URLSession.shared.dataTask(with: req) { data, _, _ in
            DispatchQueue.main.async {
                if let data = data, let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let service = json["service"] as? [String: Any], service["id"] as? String == "local.roundtable", service["storage"] as? String == "desktop" { self.web.load(URLRequest(url: self.baseURL)); return }
                if self.startupAttempt < 50 { DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { self.waitForService() } }
                else { self.showError("啟動時間超過預期，請重新開啟 App。\nStartup timed out. Please reopen the app.") }
            }
        }.resume()
    }

    func showError(_ message: String) {
        loading?.removeFromSuperview()
        let alert = NSAlert(); alert.messageText = text("研究圓桌無法完成此操作", "Roundtable could not complete this action"); alert.informativeText = message
        alert.addButton(withTitle: text("好", "OK")); alert.beginSheetModal(for: window)
    }
    @objc func showAbout() { NSApp.orderFrontStandardAboutPanel(options: [.applicationName: "研究圓桌 · Roundtable", .applicationVersion: "0.6.0", .credits: NSAttributedString(string: "個人研究與決策工作區\nLocal research and decision workspace")]) }
    @objc func newResearch() { web.evaluateJavaScript("document.querySelector('[data-action=\"new\"]')?.click()") }
    @objc func reload() { web.reload() }
    @objc func showData() { NSWorkspace.shared.open(support) }
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows: Bool) -> Bool { window.makeKeyAndOrderFront(nil); return true }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        guard let server = server, server.isRunning else { return .terminateNow }
        if terminating { return .terminateLater }
        terminating = true; server.terminate()
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) { if server.isRunning { kill(server.processIdentifier, SIGKILL) }; NSApp.reply(toApplicationShouldTerminate: true) }
        return .terminateLater
    }
    func applicationWillTerminate(_ notification: Notification) { if lockFD >= 0 { flock(lockFD, LOCK_UN); Darwin.close(lockFD) }; try? logHandle?.close() }

    func allowed(_ url: URL) -> Bool { url.scheme == "http" && url.host == "127.0.0.1" && url.port == port }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if allowed(url) { decisionHandler(navigationAction.shouldPerformDownload ? .download : .allow); return }
        if ["https", "http"].contains(url.scheme ?? ""), navigationAction.navigationType == .linkActivated { NSWorkspace.shared.open(url) }
        decisionHandler(.cancel)
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        if let response = navigationResponse.response as? HTTPURLResponse, response.value(forHTTPHeaderField: "Content-Disposition")?.contains("attachment") == true { decisionHandler(.download) }
        else { decisionHandler(navigationResponse.canShowMIMEType ? .allow : .cancel) }
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { loading.removeFromSuperview() }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { if (error as NSError).code != NSURLErrorCancelled { showError(error.localizedDescription) } }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url, ["http", "https"].contains(url.scheme ?? ""), !allowed(url) { NSWorkspace.shared.open(url) }
        return nil
    }
    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel(); panel.canChooseDirectories = false; panel.canChooseFiles = true; panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.allowedContentTypes = [.plainText, .json, UTType(filenameExtension: "md") ?? .plainText]
        panel.beginSheetModal(for: window) { completionHandler($0 == .OK ? panel.urls : nil) }
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, let url = message.frameInfo.request.url, allowed(url), let body = message.body as? [String: Any] else { return }
        if body["action"] as? String == "copy", let text = body["text"] as? String, text.utf8.count <= 600000 { NSPasteboard.general.clearContents(); NSPasteboard.general.setString(text, forType: .string) }
        if body["action"] as? String == "language", let lang = body["value"] as? String { UserDefaults.standard.set(lang == "en" ? "en" : "zh", forKey: "interfaceLanguage") }
    }
    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) { download.delegate = self }
    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) { download.delegate = self }
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let panel = NSSavePanel(); panel.nameFieldStringValue = suggestedFilename; panel.allowedContentTypes = [UTType(filenameExtension: "md") ?? .plainText]
        panel.beginSheetModal(for: window) { result in
            guard result == .OK, let destination = panel.url else { completionHandler(nil); return }
            let temporary = destination.deletingLastPathComponent().appendingPathComponent(".roundtable-export-" + UUID().uuidString + ".tmp")
            self.downloads[ObjectIdentifier(download)] = (temporary, destination)
            completionHandler(temporary)
        }
    }
    func downloadDidFinish(_ download: WKDownload) {
        guard let (temporary, destination) = downloads.removeValue(forKey: ObjectIdentifier(download)) else { return }
        do {
            if fm.fileExists(atPath: destination.path) { _ = try fm.replaceItemAt(destination, withItemAt: temporary) }
            else { try fm.moveItem(at: temporary, to: destination) }
        } catch { showError(error.localizedDescription) }
    }
    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        if let (temporary, _) = downloads.removeValue(forKey: ObjectIdentifier(download)) { try? fm.removeItem(at: temporary) }
        if (error as NSError).code != NSURLErrorCancelled { showError(error.localizedDescription) } }
}
let application = NSApplication.shared
let delegate = RoundtableApp()
application.delegate = delegate
application.run()
