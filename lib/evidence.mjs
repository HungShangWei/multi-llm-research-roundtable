import https from 'node:https';
import {lookup as dnsLookup} from 'node:dns/promises';
import {isIP} from 'node:net';

// Crossref public REST metadata: https://www.crossref.org/documentation/retrieve-metadata/rest-api/
// A retrieved citation or matching passage is never evidence that a claim is supported.
const MAX_BYTES = 1024 * 1024;
const MAX_TIME = 12000;
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
// Named HTML5 entities; exported from Python standard-library html.entities, no runtime dependency.
const entities = {"Aacute":"Á","aacute":"á","Abreve":"Ă","abreve":"ă","ac":"∾","acd":"∿","acE":"∾̳","Acirc":"Â","acirc":"â","acute":"´","Acy":"А","acy":"а","AElig":"Æ","aelig":"æ","af":"⁡","Afr":"𝔄","afr":"𝔞","Agrave":"À","agrave":"à","alefsym":"ℵ","aleph":"ℵ","Alpha":"Α","alpha":"α","Amacr":"Ā","amacr":"ā","amalg":"⨿","AMP":"&","amp":"&","And":"⩓","and":"∧","andand":"⩕","andd":"⩜","andslope":"⩘","andv":"⩚","ang":"∠","ange":"⦤","angle":"∠","angmsd":"∡","angmsdaa":"⦨","angmsdab":"⦩","angmsdac":"⦪","angmsdad":"⦫","angmsdae":"⦬","angmsdaf":"⦭","angmsdag":"⦮","angmsdah":"⦯","angrt":"∟","angrtvb":"⊾","angrtvbd":"⦝","angsph":"∢","angst":"Å","angzarr":"⍼","Aogon":"Ą","aogon":"ą","Aopf":"𝔸","aopf":"𝕒","ap":"≈","apacir":"⩯","apE":"⩰","ape":"≊","apid":"≋","apos":"'","ApplyFunction":"⁡","approx":"≈","approxeq":"≊","Aring":"Å","aring":"å","Ascr":"𝒜","ascr":"𝒶","Assign":"≔","ast":"*","asymp":"≈","asympeq":"≍","Atilde":"Ã","atilde":"ã","Auml":"Ä","auml":"ä","awconint":"∳","awint":"⨑","backcong":"≌","backepsilon":"϶","backprime":"‵","backsim":"∽","backsimeq":"⋍","Backslash":"∖","Barv":"⫧","barvee":"⊽","Barwed":"⌆","barwed":"⌅","barwedge":"⌅","bbrk":"⎵","bbrktbrk":"⎶","bcong":"≌","Bcy":"Б","bcy":"б","bdquo":"„","becaus":"∵","Because":"∵","because":"∵","bemptyv":"⦰","bepsi":"϶","bernou":"ℬ","Bernoullis":"ℬ","Beta":"Β","beta":"β","beth":"ℶ","between":"≬","Bfr":"𝔅","bfr":"𝔟","bigcap":"⋂","bigcirc":"◯","bigcup":"⋃","bigodot":"⨀","bigoplus":"⨁","bigotimes":"⨂","bigsqcup":"⨆","bigstar":"★","bigtriangledown":"▽","bigtriangleup":"△","biguplus":"⨄","bigvee":"⋁","bigwedge":"⋀","bkarow":"⤍","blacklozenge":"⧫","blacksquare":"▪","blacktriangle":"▴","blacktriangledown":"▾","blacktriangleleft":"◂","blacktriangleright":"▸","blank":"␣","blk12":"▒","blk14":"░","blk34":"▓","block":"█","bne":"=⃥","bnequiv":"≡⃥","bNot":"⫭","bnot":"⌐","Bopf":"𝔹","bopf":"𝕓","bot":"⊥","bottom":"⊥","bowtie":"⋈","boxbox":"⧉","boxDL":"╗","boxDl":"╖","boxdL":"╕","boxdl":"┐","boxDR":"╔","boxDr":"╓","boxdR":"╒","boxdr":"┌","boxH":"═","boxh":"─","boxHD":"╦","boxHd":"╤","boxhD":"╥","boxhd":"┬","boxHU":"╩","boxHu":"╧","boxhU":"╨","boxhu":"┴","boxminus":"⊟","boxplus":"⊞","boxtimes":"⊠","boxUL":"╝","boxUl":"╜","boxuL":"╛","boxul":"┘","boxUR":"╚","boxUr":"╙","boxuR":"╘","boxur":"└","boxV":"║","boxv":"│","boxVH":"╬","boxVh":"╫","boxvH":"╪","boxvh":"┼","boxVL":"╣","boxVl":"╢","boxvL":"╡","boxvl":"┤","boxVR":"╠","boxVr":"╟","boxvR":"╞","boxvr":"├","bprime":"‵","Breve":"˘","breve":"˘","brvbar":"¦","Bscr":"ℬ","bscr":"𝒷","bsemi":"⁏","bsim":"∽","bsime":"⋍","bsol":"\\","bsolb":"⧅","bsolhsub":"⟈","bull":"•","bullet":"•","bump":"≎","bumpE":"⪮","bumpe":"≏","Bumpeq":"≎","bumpeq":"≏","Cacute":"Ć","cacute":"ć","Cap":"⋒","cap":"∩","capand":"⩄","capbrcup":"⩉","capcap":"⩋","capcup":"⩇","capdot":"⩀","CapitalDifferentialD":"ⅅ","caps":"∩︀","caret":"⁁","caron":"ˇ","Cayleys":"ℭ","ccaps":"⩍","Ccaron":"Č","ccaron":"č","Ccedil":"Ç","ccedil":"ç","Ccirc":"Ĉ","ccirc":"ĉ","Cconint":"∰","ccups":"⩌","ccupssm":"⩐","Cdot":"Ċ","cdot":"ċ","cedil":"¸","Cedilla":"¸","cemptyv":"⦲","cent":"¢","CenterDot":"·","centerdot":"·","Cfr":"ℭ","cfr":"𝔠","CHcy":"Ч","chcy":"ч","check":"✓","checkmark":"✓","Chi":"Χ","chi":"χ","cir":"○","circ":"ˆ","circeq":"≗","circlearrowleft":"↺","circlearrowright":"↻","circledast":"⊛","circledcirc":"⊚","circleddash":"⊝","CircleDot":"⊙","circledR":"®","circledS":"Ⓢ","CircleMinus":"⊖","CirclePlus":"⊕","CircleTimes":"⊗","cirE":"⧃","cire":"≗","cirfnint":"⨐","cirmid":"⫯","cirscir":"⧂","ClockwiseContourIntegral":"∲","CloseCurlyDoubleQuote":"”","CloseCurlyQuote":"’","clubs":"♣","clubsuit":"♣","Colon":"∷","colon":":","Colone":"⩴","colone":"≔","coloneq":"≔","comma":",","commat":"@","comp":"∁","compfn":"∘","complement":"∁","complexes":"ℂ","cong":"≅","congdot":"⩭","Congruent":"≡","Conint":"∯","conint":"∮","ContourIntegral":"∮","Copf":"ℂ","copf":"𝕔","coprod":"∐","Coproduct":"∐","COPY":"©","copy":"©","copysr":"℗","CounterClockwiseContourIntegral":"∳","crarr":"↵","Cross":"⨯","cross":"✗","Cscr":"𝒞","cscr":"𝒸","csub":"⫏","csube":"⫑","csup":"⫐","csupe":"⫒","ctdot":"⋯","cudarrl":"⤸","cudarrr":"⤵","cuepr":"⋞","cuesc":"⋟","cularr":"↶","cularrp":"⤽","Cup":"⋓","cup":"∪","cupbrcap":"⩈","CupCap":"≍","cupcap":"⩆","cupcup":"⩊","cupdot":"⊍","cupor":"⩅","cups":"∪︀","curarr":"↷","curarrm":"⤼","curlyeqprec":"⋞","curlyeqsucc":"⋟","curlyvee":"⋎","curlywedge":"⋏","curren":"¤","curvearrowleft":"↶","curvearrowright":"↷","cuvee":"⋎","cuwed":"⋏","cwconint":"∲","cwint":"∱","cylcty":"⌭","Dagger":"‡","dagger":"†","daleth":"ℸ","Darr":"↡","dArr":"⇓","darr":"↓","dash":"‐","Dashv":"⫤","dashv":"⊣","dbkarow":"⤏","dblac":"˝","Dcaron":"Ď","dcaron":"ď","Dcy":"Д","dcy":"д","DD":"ⅅ","dd":"ⅆ","ddagger":"‡","ddarr":"⇊","DDotrahd":"⤑","ddotseq":"⩷","deg":"°","Del":"∇","Delta":"Δ","delta":"δ","demptyv":"⦱","dfisht":"⥿","Dfr":"𝔇","dfr":"𝔡","dHar":"⥥","dharl":"⇃","dharr":"⇂","DiacriticalAcute":"´","DiacriticalDot":"˙","DiacriticalDoubleAcute":"˝","DiacriticalGrave":"`","DiacriticalTilde":"˜","diam":"⋄","Diamond":"⋄","diamond":"⋄","diamondsuit":"♦","diams":"♦","die":"¨","DifferentialD":"ⅆ","digamma":"ϝ","disin":"⋲","div":"÷","divide":"÷","divideontimes":"⋇","divonx":"⋇","DJcy":"Ђ","djcy":"ђ","dlcorn":"⌞","dlcrop":"⌍","dollar":"$","Dopf":"𝔻","dopf":"𝕕","Dot":"¨","dot":"˙","DotDot":"⃜","doteq":"≐","doteqdot":"≑","DotEqual":"≐","dotminus":"∸","dotplus":"∔","dotsquare":"⊡","doublebarwedge":"⌆","DoubleContourIntegral":"∯","DoubleDot":"¨","DoubleDownArrow":"⇓","DoubleLeftArrow":"⇐","DoubleLeftRightArrow":"⇔","DoubleLeftTee":"⫤","DoubleLongLeftArrow":"⟸","DoubleLongLeftRightArrow":"⟺","DoubleLongRightArrow":"⟹","DoubleRightArrow":"⇒","DoubleRightTee":"⊨","DoubleUpArrow":"⇑","DoubleUpDownArrow":"⇕","DoubleVerticalBar":"∥","DownArrow":"↓","Downarrow":"⇓","downarrow":"↓","DownArrowBar":"⤓","DownArrowUpArrow":"⇵","DownBreve":"̑","downdownarrows":"⇊","downharpoonleft":"⇃","downharpoonright":"⇂","DownLeftRightVector":"⥐","DownLeftTeeVector":"⥞","DownLeftVector":"↽","DownLeftVectorBar":"⥖","DownRightTeeVector":"⥟","DownRightVector":"⇁","DownRightVectorBar":"⥗","DownTee":"⊤","DownTeeArrow":"↧","drbkarow":"⤐","drcorn":"⌟","drcrop":"⌌","Dscr":"𝒟","dscr":"𝒹","DScy":"Ѕ","dscy":"ѕ","dsol":"⧶","Dstrok":"Đ","dstrok":"đ","dtdot":"⋱","dtri":"▿","dtrif":"▾","duarr":"⇵","duhar":"⥯","dwangle":"⦦","DZcy":"Џ","dzcy":"џ","dzigrarr":"⟿","Eacute":"É","eacute":"é","easter":"⩮","Ecaron":"Ě","ecaron":"ě","ecir":"≖","Ecirc":"Ê","ecirc":"ê","ecolon":"≕","Ecy":"Э","ecy":"э","eDDot":"⩷","Edot":"Ė","eDot":"≑","edot":"ė","ee":"ⅇ","efDot":"≒","Efr":"𝔈","efr":"𝔢","eg":"⪚","Egrave":"È","egrave":"è","egs":"⪖","egsdot":"⪘","el":"⪙","Element":"∈","elinters":"⏧","ell":"ℓ","els":"⪕","elsdot":"⪗","Emacr":"Ē","emacr":"ē","empty":"∅","emptyset":"∅","EmptySmallSquare":"◻","emptyv":"∅","EmptyVerySmallSquare":"▫","emsp13":" ","emsp14":" ","emsp":" ","ENG":"Ŋ","eng":"ŋ","ensp":" ","Eogon":"Ę","eogon":"ę","Eopf":"𝔼","eopf":"𝕖","epar":"⋕","eparsl":"⧣","eplus":"⩱","epsi":"ε","Epsilon":"Ε","epsilon":"ε","epsiv":"ϵ","eqcirc":"≖","eqcolon":"≕","eqsim":"≂","eqslantgtr":"⪖","eqslantless":"⪕","Equal":"⩵","equals":"=","EqualTilde":"≂","equest":"≟","Equilibrium":"⇌","equiv":"≡","equivDD":"⩸","eqvparsl":"⧥","erarr":"⥱","erDot":"≓","Escr":"ℰ","escr":"ℯ","esdot":"≐","Esim":"⩳","esim":"≂","Eta":"Η","eta":"η","ETH":"Ð","eth":"ð","Euml":"Ë","euml":"ë","euro":"€","excl":"!","exist":"∃","Exists":"∃","expectation":"ℰ","ExponentialE":"ⅇ","exponentiale":"ⅇ","fallingdotseq":"≒","Fcy":"Ф","fcy":"ф","female":"♀","ffilig":"ﬃ","fflig":"ﬀ","ffllig":"ﬄ","Ffr":"𝔉","ffr":"𝔣","filig":"ﬁ","FilledSmallSquare":"◼","FilledVerySmallSquare":"▪","fjlig":"fj","flat":"♭","fllig":"ﬂ","fltns":"▱","fnof":"ƒ","Fopf":"𝔽","fopf":"𝕗","ForAll":"∀","forall":"∀","fork":"⋔","forkv":"⫙","Fouriertrf":"ℱ","fpartint":"⨍","frac12":"½","frac13":"⅓","frac14":"¼","frac15":"⅕","frac16":"⅙","frac18":"⅛","frac23":"⅔","frac25":"⅖","frac34":"¾","frac35":"⅗","frac38":"⅜","frac45":"⅘","frac56":"⅚","frac58":"⅝","frac78":"⅞","frasl":"⁄","frown":"⌢","Fscr":"ℱ","fscr":"𝒻","gacute":"ǵ","Gamma":"Γ","gamma":"γ","Gammad":"Ϝ","gammad":"ϝ","gap":"⪆","Gbreve":"Ğ","gbreve":"ğ","Gcedil":"Ģ","Gcirc":"Ĝ","gcirc":"ĝ","Gcy":"Г","gcy":"г","Gdot":"Ġ","gdot":"ġ","gE":"≧","ge":"≥","gEl":"⪌","gel":"⋛","geq":"≥","geqq":"≧","geqslant":"⩾","ges":"⩾","gescc":"⪩","gesdot":"⪀","gesdoto":"⪂","gesdotol":"⪄","gesl":"⋛︀","gesles":"⪔","Gfr":"𝔊","gfr":"𝔤","Gg":"⋙","gg":"≫","ggg":"⋙","gimel":"ℷ","GJcy":"Ѓ","gjcy":"ѓ","gl":"≷","gla":"⪥","glE":"⪒","glj":"⪤","gnap":"⪊","gnapprox":"⪊","gnE":"≩","gne":"⪈","gneq":"⪈","gneqq":"≩","gnsim":"⋧","Gopf":"𝔾","gopf":"𝕘","grave":"`","GreaterEqual":"≥","GreaterEqualLess":"⋛","GreaterFullEqual":"≧","GreaterGreater":"⪢","GreaterLess":"≷","GreaterSlantEqual":"⩾","GreaterTilde":"≳","Gscr":"𝒢","gscr":"ℊ","gsim":"≳","gsime":"⪎","gsiml":"⪐","GT":">","Gt":"≫","gt":">","gtcc":"⪧","gtcir":"⩺","gtdot":"⋗","gtlPar":"⦕","gtquest":"⩼","gtrapprox":"⪆","gtrarr":"⥸","gtrdot":"⋗","gtreqless":"⋛","gtreqqless":"⪌","gtrless":"≷","gtrsim":"≳","gvertneqq":"≩︀","gvnE":"≩︀","Hacek":"ˇ","hairsp":" ","half":"½","hamilt":"ℋ","HARDcy":"Ъ","hardcy":"ъ","hArr":"⇔","harr":"↔","harrcir":"⥈","harrw":"↭","Hat":"^","hbar":"ℏ","Hcirc":"Ĥ","hcirc":"ĥ","hearts":"♥","heartsuit":"♥","hellip":"…","hercon":"⊹","Hfr":"ℌ","hfr":"𝔥","HilbertSpace":"ℋ","hksearow":"⤥","hkswarow":"⤦","hoarr":"⇿","homtht":"∻","hookleftarrow":"↩","hookrightarrow":"↪","Hopf":"ℍ","hopf":"𝕙","horbar":"―","HorizontalLine":"─","Hscr":"ℋ","hscr":"𝒽","hslash":"ℏ","Hstrok":"Ħ","hstrok":"ħ","HumpDownHump":"≎","HumpEqual":"≏","hybull":"⁃","hyphen":"‐","Iacute":"Í","iacute":"í","ic":"⁣","Icirc":"Î","icirc":"î","Icy":"И","icy":"и","Idot":"İ","IEcy":"Е","iecy":"е","iexcl":"¡","iff":"⇔","Ifr":"ℑ","ifr":"𝔦","Igrave":"Ì","igrave":"ì","ii":"ⅈ","iiiint":"⨌","iiint":"∭","iinfin":"⧜","iiota":"℩","IJlig":"Ĳ","ijlig":"ĳ","Im":"ℑ","Imacr":"Ī","imacr":"ī","image":"ℑ","ImaginaryI":"ⅈ","imagline":"ℐ","imagpart":"ℑ","imath":"ı","imof":"⊷","imped":"Ƶ","Implies":"⇒","in":"∈","incare":"℅","infin":"∞","infintie":"⧝","inodot":"ı","Int":"∬","int":"∫","intcal":"⊺","integers":"ℤ","Integral":"∫","intercal":"⊺","Intersection":"⋂","intlarhk":"⨗","intprod":"⨼","InvisibleComma":"⁣","InvisibleTimes":"⁢","IOcy":"Ё","iocy":"ё","Iogon":"Į","iogon":"į","Iopf":"𝕀","iopf":"𝕚","Iota":"Ι","iota":"ι","iprod":"⨼","iquest":"¿","Iscr":"ℐ","iscr":"𝒾","isin":"∈","isindot":"⋵","isinE":"⋹","isins":"⋴","isinsv":"⋳","isinv":"∈","it":"⁢","Itilde":"Ĩ","itilde":"ĩ","Iukcy":"І","iukcy":"і","Iuml":"Ï","iuml":"ï","Jcirc":"Ĵ","jcirc":"ĵ","Jcy":"Й","jcy":"й","Jfr":"𝔍","jfr":"𝔧","jmath":"ȷ","Jopf":"𝕁","jopf":"𝕛","Jscr":"𝒥","jscr":"𝒿","Jsercy":"Ј","jsercy":"ј","Jukcy":"Є","jukcy":"є","Kappa":"Κ","kappa":"κ","kappav":"ϰ","Kcedil":"Ķ","kcedil":"ķ","Kcy":"К","kcy":"к","Kfr":"𝔎","kfr":"𝔨","kgreen":"ĸ","KHcy":"Х","khcy":"х","KJcy":"Ќ","kjcy":"ќ","Kopf":"𝕂","kopf":"𝕜","Kscr":"𝒦","kscr":"𝓀","lAarr":"⇚","Lacute":"Ĺ","lacute":"ĺ","laemptyv":"⦴","lagran":"ℒ","Lambda":"Λ","lambda":"λ","Lang":"⟪","lang":"⟨","langd":"⦑","langle":"⟨","lap":"⪅","Laplacetrf":"ℒ","laquo":"«","Larr":"↞","lArr":"⇐","larr":"←","larrb":"⇤","larrbfs":"⤟","larrfs":"⤝","larrhk":"↩","larrlp":"↫","larrpl":"⤹","larrsim":"⥳","larrtl":"↢","lat":"⪫","lAtail":"⤛","latail":"⤙","late":"⪭","lates":"⪭︀","lBarr":"⤎","lbarr":"⤌","lbbrk":"❲","lbrace":"{","lbrack":"[","lbrke":"⦋","lbrksld":"⦏","lbrkslu":"⦍","Lcaron":"Ľ","lcaron":"ľ","Lcedil":"Ļ","lcedil":"ļ","lceil":"⌈","lcub":"{","Lcy":"Л","lcy":"л","ldca":"⤶","ldquo":"“","ldquor":"„","ldrdhar":"⥧","ldrushar":"⥋","ldsh":"↲","lE":"≦","le":"≤","LeftAngleBracket":"⟨","LeftArrow":"←","Leftarrow":"⇐","leftarrow":"←","LeftArrowBar":"⇤","LeftArrowRightArrow":"⇆","leftarrowtail":"↢","LeftCeiling":"⌈","LeftDoubleBracket":"⟦","LeftDownTeeVector":"⥡","LeftDownVector":"⇃","LeftDownVectorBar":"⥙","LeftFloor":"⌊","leftharpoondown":"↽","leftharpoonup":"↼","leftleftarrows":"⇇","LeftRightArrow":"↔","Leftrightarrow":"⇔","leftrightarrow":"↔","leftrightarrows":"⇆","leftrightharpoons":"⇋","leftrightsquigarrow":"↭","LeftRightVector":"⥎","LeftTee":"⊣","LeftTeeArrow":"↤","LeftTeeVector":"⥚","leftthreetimes":"⋋","LeftTriangle":"⊲","LeftTriangleBar":"⧏","LeftTriangleEqual":"⊴","LeftUpDownVector":"⥑","LeftUpTeeVector":"⥠","LeftUpVector":"↿","LeftUpVectorBar":"⥘","LeftVector":"↼","LeftVectorBar":"⥒","lEg":"⪋","leg":"⋚","leq":"≤","leqq":"≦","leqslant":"⩽","les":"⩽","lescc":"⪨","lesdot":"⩿","lesdoto":"⪁","lesdotor":"⪃","lesg":"⋚︀","lesges":"⪓","lessapprox":"⪅","lessdot":"⋖","lesseqgtr":"⋚","lesseqqgtr":"⪋","LessEqualGreater":"⋚","LessFullEqual":"≦","LessGreater":"≶","lessgtr":"≶","LessLess":"⪡","lesssim":"≲","LessSlantEqual":"⩽","LessTilde":"≲","lfisht":"⥼","lfloor":"⌊","Lfr":"𝔏","lfr":"𝔩","lg":"≶","lgE":"⪑","lHar":"⥢","lhard":"↽","lharu":"↼","lharul":"⥪","lhblk":"▄","LJcy":"Љ","ljcy":"љ","Ll":"⋘","ll":"≪","llarr":"⇇","llcorner":"⌞","Lleftarrow":"⇚","llhard":"⥫","lltri":"◺","Lmidot":"Ŀ","lmidot":"ŀ","lmoust":"⎰","lmoustache":"⎰","lnap":"⪉","lnapprox":"⪉","lnE":"≨","lne":"⪇","lneq":"⪇","lneqq":"≨","lnsim":"⋦","loang":"⟬","loarr":"⇽","lobrk":"⟦","LongLeftArrow":"⟵","Longleftarrow":"⟸","longleftarrow":"⟵","LongLeftRightArrow":"⟷","Longleftrightarrow":"⟺","longleftrightarrow":"⟷","longmapsto":"⟼","LongRightArrow":"⟶","Longrightarrow":"⟹","longrightarrow":"⟶","looparrowleft":"↫","looparrowright":"↬","lopar":"⦅","Lopf":"𝕃","lopf":"𝕝","loplus":"⨭","lotimes":"⨴","lowast":"∗","lowbar":"_","LowerLeftArrow":"↙","LowerRightArrow":"↘","loz":"◊","lozenge":"◊","lozf":"⧫","lpar":"(","lparlt":"⦓","lrarr":"⇆","lrcorner":"⌟","lrhar":"⇋","lrhard":"⥭","lrm":"‎","lrtri":"⊿","lsaquo":"‹","Lscr":"ℒ","lscr":"𝓁","Lsh":"↰","lsh":"↰","lsim":"≲","lsime":"⪍","lsimg":"⪏","lsqb":"[","lsquo":"‘","lsquor":"‚","Lstrok":"Ł","lstrok":"ł","LT":"<","Lt":"≪","lt":"<","ltcc":"⪦","ltcir":"⩹","ltdot":"⋖","lthree":"⋋","ltimes":"⋉","ltlarr":"⥶","ltquest":"⩻","ltri":"◃","ltrie":"⊴","ltrif":"◂","ltrPar":"⦖","lurdshar":"⥊","luruhar":"⥦","lvertneqq":"≨︀","lvnE":"≨︀","macr":"¯","male":"♂","malt":"✠","maltese":"✠","Map":"⤅","map":"↦","mapsto":"↦","mapstodown":"↧","mapstoleft":"↤","mapstoup":"↥","marker":"▮","mcomma":"⨩","Mcy":"М","mcy":"м","mdash":"—","mDDot":"∺","measuredangle":"∡","MediumSpace":" ","Mellintrf":"ℳ","Mfr":"𝔐","mfr":"𝔪","mho":"℧","micro":"µ","mid":"∣","midast":"*","midcir":"⫰","middot":"·","minus":"−","minusb":"⊟","minusd":"∸","minusdu":"⨪","MinusPlus":"∓","mlcp":"⫛","mldr":"…","mnplus":"∓","models":"⊧","Mopf":"𝕄","mopf":"𝕞","mp":"∓","Mscr":"ℳ","mscr":"𝓂","mstpos":"∾","Mu":"Μ","mu":"μ","multimap":"⊸","mumap":"⊸","nabla":"∇","Nacute":"Ń","nacute":"ń","nang":"∠⃒","nap":"≉","napE":"⩰̸","napid":"≋̸","napos":"ŉ","napprox":"≉","natur":"♮","natural":"♮","naturals":"ℕ","nbsp":" ","nbump":"≎̸","nbumpe":"≏̸","ncap":"⩃","Ncaron":"Ň","ncaron":"ň","Ncedil":"Ņ","ncedil":"ņ","ncong":"≇","ncongdot":"⩭̸","ncup":"⩂","Ncy":"Н","ncy":"н","ndash":"–","ne":"≠","nearhk":"⤤","neArr":"⇗","nearr":"↗","nearrow":"↗","nedot":"≐̸","NegativeMediumSpace":"​","NegativeThickSpace":"​","NegativeThinSpace":"​","NegativeVeryThinSpace":"​","nequiv":"≢","nesear":"⤨","nesim":"≂̸","NestedGreaterGreater":"≫","NestedLessLess":"≪","NewLine":"\n","nexist":"∄","nexists":"∄","Nfr":"𝔑","nfr":"𝔫","ngE":"≧̸","nge":"≱","ngeq":"≱","ngeqq":"≧̸","ngeqslant":"⩾̸","nges":"⩾̸","nGg":"⋙̸","ngsim":"≵","nGt":"≫⃒","ngt":"≯","ngtr":"≯","nGtv":"≫̸","nhArr":"⇎","nharr":"↮","nhpar":"⫲","ni":"∋","nis":"⋼","nisd":"⋺","niv":"∋","NJcy":"Њ","njcy":"њ","nlArr":"⇍","nlarr":"↚","nldr":"‥","nlE":"≦̸","nle":"≰","nLeftarrow":"⇍","nleftarrow":"↚","nLeftrightarrow":"⇎","nleftrightarrow":"↮","nleq":"≰","nleqq":"≦̸","nleqslant":"⩽̸","nles":"⩽̸","nless":"≮","nLl":"⋘̸","nlsim":"≴","nLt":"≪⃒","nlt":"≮","nltri":"⋪","nltrie":"⋬","nLtv":"≪̸","nmid":"∤","NoBreak":"⁠","NonBreakingSpace":" ","Nopf":"ℕ","nopf":"𝕟","Not":"⫬","not":"¬","NotCongruent":"≢","NotCupCap":"≭","NotDoubleVerticalBar":"∦","NotElement":"∉","NotEqual":"≠","NotEqualTilde":"≂̸","NotExists":"∄","NotGreater":"≯","NotGreaterEqual":"≱","NotGreaterFullEqual":"≧̸","NotGreaterGreater":"≫̸","NotGreaterLess":"≹","NotGreaterSlantEqual":"⩾̸","NotGreaterTilde":"≵","NotHumpDownHump":"≎̸","NotHumpEqual":"≏̸","notin":"∉","notindot":"⋵̸","notinE":"⋹̸","notinva":"∉","notinvb":"⋷","notinvc":"⋶","NotLeftTriangle":"⋪","NotLeftTriangleBar":"⧏̸","NotLeftTriangleEqual":"⋬","NotLess":"≮","NotLessEqual":"≰","NotLessGreater":"≸","NotLessLess":"≪̸","NotLessSlantEqual":"⩽̸","NotLessTilde":"≴","NotNestedGreaterGreater":"⪢̸","NotNestedLessLess":"⪡̸","notni":"∌","notniva":"∌","notnivb":"⋾","notnivc":"⋽","NotPrecedes":"⊀","NotPrecedesEqual":"⪯̸","NotPrecedesSlantEqual":"⋠","NotReverseElement":"∌","NotRightTriangle":"⋫","NotRightTriangleBar":"⧐̸","NotRightTriangleEqual":"⋭","NotSquareSubset":"⊏̸","NotSquareSubsetEqual":"⋢","NotSquareSuperset":"⊐̸","NotSquareSupersetEqual":"⋣","NotSubset":"⊂⃒","NotSubsetEqual":"⊈","NotSucceeds":"⊁","NotSucceedsEqual":"⪰̸","NotSucceedsSlantEqual":"⋡","NotSucceedsTilde":"≿̸","NotSuperset":"⊃⃒","NotSupersetEqual":"⊉","NotTilde":"≁","NotTildeEqual":"≄","NotTildeFullEqual":"≇","NotTildeTilde":"≉","NotVerticalBar":"∤","npar":"∦","nparallel":"∦","nparsl":"⫽⃥","npart":"∂̸","npolint":"⨔","npr":"⊀","nprcue":"⋠","npre":"⪯̸","nprec":"⊀","npreceq":"⪯̸","nrArr":"⇏","nrarr":"↛","nrarrc":"⤳̸","nrarrw":"↝̸","nRightarrow":"⇏","nrightarrow":"↛","nrtri":"⋫","nrtrie":"⋭","nsc":"⊁","nsccue":"⋡","nsce":"⪰̸","Nscr":"𝒩","nscr":"𝓃","nshortmid":"∤","nshortparallel":"∦","nsim":"≁","nsime":"≄","nsimeq":"≄","nsmid":"∤","nspar":"∦","nsqsube":"⋢","nsqsupe":"⋣","nsub":"⊄","nsubE":"⫅̸","nsube":"⊈","nsubset":"⊂⃒","nsubseteq":"⊈","nsubseteqq":"⫅̸","nsucc":"⊁","nsucceq":"⪰̸","nsup":"⊅","nsupE":"⫆̸","nsupe":"⊉","nsupset":"⊃⃒","nsupseteq":"⊉","nsupseteqq":"⫆̸","ntgl":"≹","Ntilde":"Ñ","ntilde":"ñ","ntlg":"≸","ntriangleleft":"⋪","ntrianglelefteq":"⋬","ntriangleright":"⋫","ntrianglerighteq":"⋭","Nu":"Ν","nu":"ν","num":"#","numero":"№","numsp":" ","nvap":"≍⃒","nVDash":"⊯","nVdash":"⊮","nvDash":"⊭","nvdash":"⊬","nvge":"≥⃒","nvgt":">⃒","nvHarr":"⤄","nvinfin":"⧞","nvlArr":"⤂","nvle":"≤⃒","nvlt":"<⃒","nvltrie":"⊴⃒","nvrArr":"⤃","nvrtrie":"⊵⃒","nvsim":"∼⃒","nwarhk":"⤣","nwArr":"⇖","nwarr":"↖","nwarrow":"↖","nwnear":"⤧","Oacute":"Ó","oacute":"ó","oast":"⊛","ocir":"⊚","Ocirc":"Ô","ocirc":"ô","Ocy":"О","ocy":"о","odash":"⊝","Odblac":"Ő","odblac":"ő","odiv":"⨸","odot":"⊙","odsold":"⦼","OElig":"Œ","oelig":"œ","ofcir":"⦿","Ofr":"𝔒","ofr":"𝔬","ogon":"˛","Ograve":"Ò","ograve":"ò","ogt":"⧁","ohbar":"⦵","ohm":"Ω","oint":"∮","olarr":"↺","olcir":"⦾","olcross":"⦻","oline":"‾","olt":"⧀","Omacr":"Ō","omacr":"ō","Omega":"Ω","omega":"ω","Omicron":"Ο","omicron":"ο","omid":"⦶","ominus":"⊖","Oopf":"𝕆","oopf":"𝕠","opar":"⦷","OpenCurlyDoubleQuote":"“","OpenCurlyQuote":"‘","operp":"⦹","oplus":"⊕","Or":"⩔","or":"∨","orarr":"↻","ord":"⩝","order":"ℴ","orderof":"ℴ","ordf":"ª","ordm":"º","origof":"⊶","oror":"⩖","orslope":"⩗","orv":"⩛","oS":"Ⓢ","Oscr":"𝒪","oscr":"ℴ","Oslash":"Ø","oslash":"ø","osol":"⊘","Otilde":"Õ","otilde":"õ","Otimes":"⨷","otimes":"⊗","otimesas":"⨶","Ouml":"Ö","ouml":"ö","ovbar":"⌽","OverBar":"‾","OverBrace":"⏞","OverBracket":"⎴","OverParenthesis":"⏜","par":"∥","para":"¶","parallel":"∥","parsim":"⫳","parsl":"⫽","part":"∂","PartialD":"∂","Pcy":"П","pcy":"п","percnt":"%","period":".","permil":"‰","perp":"⊥","pertenk":"‱","Pfr":"𝔓","pfr":"𝔭","Phi":"Φ","phi":"φ","phiv":"ϕ","phmmat":"ℳ","phone":"☎","Pi":"Π","pi":"π","pitchfork":"⋔","piv":"ϖ","planck":"ℏ","planckh":"ℎ","plankv":"ℏ","plus":"+","plusacir":"⨣","plusb":"⊞","pluscir":"⨢","plusdo":"∔","plusdu":"⨥","pluse":"⩲","PlusMinus":"±","plusmn":"±","plussim":"⨦","plustwo":"⨧","pm":"±","Poincareplane":"ℌ","pointint":"⨕","Popf":"ℙ","popf":"𝕡","pound":"£","Pr":"⪻","pr":"≺","prap":"⪷","prcue":"≼","prE":"⪳","pre":"⪯","prec":"≺","precapprox":"⪷","preccurlyeq":"≼","Precedes":"≺","PrecedesEqual":"⪯","PrecedesSlantEqual":"≼","PrecedesTilde":"≾","preceq":"⪯","precnapprox":"⪹","precneqq":"⪵","precnsim":"⋨","precsim":"≾","Prime":"″","prime":"′","primes":"ℙ","prnap":"⪹","prnE":"⪵","prnsim":"⋨","prod":"∏","Product":"∏","profalar":"⌮","profline":"⌒","profsurf":"⌓","prop":"∝","Proportion":"∷","Proportional":"∝","propto":"∝","prsim":"≾","prurel":"⊰","Pscr":"𝒫","pscr":"𝓅","Psi":"Ψ","psi":"ψ","puncsp":" ","Qfr":"𝔔","qfr":"𝔮","qint":"⨌","Qopf":"ℚ","qopf":"𝕢","qprime":"⁗","Qscr":"𝒬","qscr":"𝓆","quaternions":"ℍ","quatint":"⨖","quest":"?","questeq":"≟","QUOT":"\"","quot":"\"","rAarr":"⇛","race":"∽̱","Racute":"Ŕ","racute":"ŕ","radic":"√","raemptyv":"⦳","Rang":"⟫","rang":"⟩","rangd":"⦒","range":"⦥","rangle":"⟩","raquo":"»","Rarr":"↠","rArr":"⇒","rarr":"→","rarrap":"⥵","rarrb":"⇥","rarrbfs":"⤠","rarrc":"⤳","rarrfs":"⤞","rarrhk":"↪","rarrlp":"↬","rarrpl":"⥅","rarrsim":"⥴","Rarrtl":"⤖","rarrtl":"↣","rarrw":"↝","rAtail":"⤜","ratail":"⤚","ratio":"∶","rationals":"ℚ","RBarr":"⤐","rBarr":"⤏","rbarr":"⤍","rbbrk":"❳","rbrace":"}","rbrack":"]","rbrke":"⦌","rbrksld":"⦎","rbrkslu":"⦐","Rcaron":"Ř","rcaron":"ř","Rcedil":"Ŗ","rcedil":"ŗ","rceil":"⌉","rcub":"}","Rcy":"Р","rcy":"р","rdca":"⤷","rdldhar":"⥩","rdquo":"”","rdquor":"”","rdsh":"↳","Re":"ℜ","real":"ℜ","realine":"ℛ","realpart":"ℜ","reals":"ℝ","rect":"▭","REG":"®","reg":"®","ReverseElement":"∋","ReverseEquilibrium":"⇋","ReverseUpEquilibrium":"⥯","rfisht":"⥽","rfloor":"⌋","Rfr":"ℜ","rfr":"𝔯","rHar":"⥤","rhard":"⇁","rharu":"⇀","rharul":"⥬","Rho":"Ρ","rho":"ρ","rhov":"ϱ","RightAngleBracket":"⟩","RightArrow":"→","Rightarrow":"⇒","rightarrow":"→","RightArrowBar":"⇥","RightArrowLeftArrow":"⇄","rightarrowtail":"↣","RightCeiling":"⌉","RightDoubleBracket":"⟧","RightDownTeeVector":"⥝","RightDownVector":"⇂","RightDownVectorBar":"⥕","RightFloor":"⌋","rightharpoondown":"⇁","rightharpoonup":"⇀","rightleftarrows":"⇄","rightleftharpoons":"⇌","rightrightarrows":"⇉","rightsquigarrow":"↝","RightTee":"⊢","RightTeeArrow":"↦","RightTeeVector":"⥛","rightthreetimes":"⋌","RightTriangle":"⊳","RightTriangleBar":"⧐","RightTriangleEqual":"⊵","RightUpDownVector":"⥏","RightUpTeeVector":"⥜","RightUpVector":"↾","RightUpVectorBar":"⥔","RightVector":"⇀","RightVectorBar":"⥓","ring":"˚","risingdotseq":"≓","rlarr":"⇄","rlhar":"⇌","rlm":"‏","rmoust":"⎱","rmoustache":"⎱","rnmid":"⫮","roang":"⟭","roarr":"⇾","robrk":"⟧","ropar":"⦆","Ropf":"ℝ","ropf":"𝕣","roplus":"⨮","rotimes":"⨵","RoundImplies":"⥰","rpar":")","rpargt":"⦔","rppolint":"⨒","rrarr":"⇉","Rrightarrow":"⇛","rsaquo":"›","Rscr":"ℛ","rscr":"𝓇","Rsh":"↱","rsh":"↱","rsqb":"]","rsquo":"’","rsquor":"’","rthree":"⋌","rtimes":"⋊","rtri":"▹","rtrie":"⊵","rtrif":"▸","rtriltri":"⧎","RuleDelayed":"⧴","ruluhar":"⥨","rx":"℞","Sacute":"Ś","sacute":"ś","sbquo":"‚","Sc":"⪼","sc":"≻","scap":"⪸","Scaron":"Š","scaron":"š","sccue":"≽","scE":"⪴","sce":"⪰","Scedil":"Ş","scedil":"ş","Scirc":"Ŝ","scirc":"ŝ","scnap":"⪺","scnE":"⪶","scnsim":"⋩","scpolint":"⨓","scsim":"≿","Scy":"С","scy":"с","sdot":"⋅","sdotb":"⊡","sdote":"⩦","searhk":"⤥","seArr":"⇘","searr":"↘","searrow":"↘","sect":"§","semi":";","seswar":"⤩","setminus":"∖","setmn":"∖","sext":"✶","Sfr":"𝔖","sfr":"𝔰","sfrown":"⌢","sharp":"♯","SHCHcy":"Щ","shchcy":"щ","SHcy":"Ш","shcy":"ш","ShortDownArrow":"↓","ShortLeftArrow":"←","shortmid":"∣","shortparallel":"∥","ShortRightArrow":"→","ShortUpArrow":"↑","shy":"­","Sigma":"Σ","sigma":"σ","sigmaf":"ς","sigmav":"ς","sim":"∼","simdot":"⩪","sime":"≃","simeq":"≃","simg":"⪞","simgE":"⪠","siml":"⪝","simlE":"⪟","simne":"≆","simplus":"⨤","simrarr":"⥲","slarr":"←","SmallCircle":"∘","smallsetminus":"∖","smashp":"⨳","smeparsl":"⧤","smid":"∣","smile":"⌣","smt":"⪪","smte":"⪬","smtes":"⪬︀","SOFTcy":"Ь","softcy":"ь","sol":"/","solb":"⧄","solbar":"⌿","Sopf":"𝕊","sopf":"𝕤","spades":"♠","spadesuit":"♠","spar":"∥","sqcap":"⊓","sqcaps":"⊓︀","sqcup":"⊔","sqcups":"⊔︀","Sqrt":"√","sqsub":"⊏","sqsube":"⊑","sqsubset":"⊏","sqsubseteq":"⊑","sqsup":"⊐","sqsupe":"⊒","sqsupset":"⊐","sqsupseteq":"⊒","squ":"□","Square":"□","square":"□","SquareIntersection":"⊓","SquareSubset":"⊏","SquareSubsetEqual":"⊑","SquareSuperset":"⊐","SquareSupersetEqual":"⊒","SquareUnion":"⊔","squarf":"▪","squf":"▪","srarr":"→","Sscr":"𝒮","sscr":"𝓈","ssetmn":"∖","ssmile":"⌣","sstarf":"⋆","Star":"⋆","star":"☆","starf":"★","straightepsilon":"ϵ","straightphi":"ϕ","strns":"¯","Sub":"⋐","sub":"⊂","subdot":"⪽","subE":"⫅","sube":"⊆","subedot":"⫃","submult":"⫁","subnE":"⫋","subne":"⊊","subplus":"⪿","subrarr":"⥹","Subset":"⋐","subset":"⊂","subseteq":"⊆","subseteqq":"⫅","SubsetEqual":"⊆","subsetneq":"⊊","subsetneqq":"⫋","subsim":"⫇","subsub":"⫕","subsup":"⫓","succ":"≻","succapprox":"⪸","succcurlyeq":"≽","Succeeds":"≻","SucceedsEqual":"⪰","SucceedsSlantEqual":"≽","SucceedsTilde":"≿","succeq":"⪰","succnapprox":"⪺","succneqq":"⪶","succnsim":"⋩","succsim":"≿","SuchThat":"∋","Sum":"∑","sum":"∑","sung":"♪","sup1":"¹","sup2":"²","sup3":"³","Sup":"⋑","sup":"⊃","supdot":"⪾","supdsub":"⫘","supE":"⫆","supe":"⊇","supedot":"⫄","Superset":"⊃","SupersetEqual":"⊇","suphsol":"⟉","suphsub":"⫗","suplarr":"⥻","supmult":"⫂","supnE":"⫌","supne":"⊋","supplus":"⫀","Supset":"⋑","supset":"⊃","supseteq":"⊇","supseteqq":"⫆","supsetneq":"⊋","supsetneqq":"⫌","supsim":"⫈","supsub":"⫔","supsup":"⫖","swarhk":"⤦","swArr":"⇙","swarr":"↙","swarrow":"↙","swnwar":"⤪","szlig":"ß","Tab":"\t","target":"⌖","Tau":"Τ","tau":"τ","tbrk":"⎴","Tcaron":"Ť","tcaron":"ť","Tcedil":"Ţ","tcedil":"ţ","Tcy":"Т","tcy":"т","tdot":"⃛","telrec":"⌕","Tfr":"𝔗","tfr":"𝔱","there4":"∴","Therefore":"∴","therefore":"∴","Theta":"Θ","theta":"θ","thetasym":"ϑ","thetav":"ϑ","thickapprox":"≈","thicksim":"∼","ThickSpace":"  ","thinsp":" ","ThinSpace":" ","thkap":"≈","thksim":"∼","THORN":"Þ","thorn":"þ","Tilde":"∼","tilde":"˜","TildeEqual":"≃","TildeFullEqual":"≅","TildeTilde":"≈","times":"×","timesb":"⊠","timesbar":"⨱","timesd":"⨰","tint":"∭","toea":"⤨","top":"⊤","topbot":"⌶","topcir":"⫱","Topf":"𝕋","topf":"𝕥","topfork":"⫚","tosa":"⤩","tprime":"‴","TRADE":"™","trade":"™","triangle":"▵","triangledown":"▿","triangleleft":"◃","trianglelefteq":"⊴","triangleq":"≜","triangleright":"▹","trianglerighteq":"⊵","tridot":"◬","trie":"≜","triminus":"⨺","TripleDot":"⃛","triplus":"⨹","trisb":"⧍","tritime":"⨻","trpezium":"⏢","Tscr":"𝒯","tscr":"𝓉","TScy":"Ц","tscy":"ц","TSHcy":"Ћ","tshcy":"ћ","Tstrok":"Ŧ","tstrok":"ŧ","twixt":"≬","twoheadleftarrow":"↞","twoheadrightarrow":"↠","Uacute":"Ú","uacute":"ú","Uarr":"↟","uArr":"⇑","uarr":"↑","Uarrocir":"⥉","Ubrcy":"Ў","ubrcy":"ў","Ubreve":"Ŭ","ubreve":"ŭ","Ucirc":"Û","ucirc":"û","Ucy":"У","ucy":"у","udarr":"⇅","Udblac":"Ű","udblac":"ű","udhar":"⥮","ufisht":"⥾","Ufr":"𝔘","ufr":"𝔲","Ugrave":"Ù","ugrave":"ù","uHar":"⥣","uharl":"↿","uharr":"↾","uhblk":"▀","ulcorn":"⌜","ulcorner":"⌜","ulcrop":"⌏","ultri":"◸","Umacr":"Ū","umacr":"ū","uml":"¨","UnderBar":"_","UnderBrace":"⏟","UnderBracket":"⎵","UnderParenthesis":"⏝","Union":"⋃","UnionPlus":"⊎","Uogon":"Ų","uogon":"ų","Uopf":"𝕌","uopf":"𝕦","UpArrow":"↑","Uparrow":"⇑","uparrow":"↑","UpArrowBar":"⤒","UpArrowDownArrow":"⇅","UpDownArrow":"↕","Updownarrow":"⇕","updownarrow":"↕","UpEquilibrium":"⥮","upharpoonleft":"↿","upharpoonright":"↾","uplus":"⊎","UpperLeftArrow":"↖","UpperRightArrow":"↗","Upsi":"ϒ","upsi":"υ","upsih":"ϒ","Upsilon":"Υ","upsilon":"υ","UpTee":"⊥","UpTeeArrow":"↥","upuparrows":"⇈","urcorn":"⌝","urcorner":"⌝","urcrop":"⌎","Uring":"Ů","uring":"ů","urtri":"◹","Uscr":"𝒰","uscr":"𝓊","utdot":"⋰","Utilde":"Ũ","utilde":"ũ","utri":"▵","utrif":"▴","uuarr":"⇈","Uuml":"Ü","uuml":"ü","uwangle":"⦧","vangrt":"⦜","varepsilon":"ϵ","varkappa":"ϰ","varnothing":"∅","varphi":"ϕ","varpi":"ϖ","varpropto":"∝","vArr":"⇕","varr":"↕","varrho":"ϱ","varsigma":"ς","varsubsetneq":"⊊︀","varsubsetneqq":"⫋︀","varsupsetneq":"⊋︀","varsupsetneqq":"⫌︀","vartheta":"ϑ","vartriangleleft":"⊲","vartriangleright":"⊳","Vbar":"⫫","vBar":"⫨","vBarv":"⫩","Vcy":"В","vcy":"в","VDash":"⊫","Vdash":"⊩","vDash":"⊨","vdash":"⊢","Vdashl":"⫦","Vee":"⋁","vee":"∨","veebar":"⊻","veeeq":"≚","vellip":"⋮","Verbar":"‖","verbar":"|","Vert":"‖","vert":"|","VerticalBar":"∣","VerticalLine":"|","VerticalSeparator":"❘","VerticalTilde":"≀","VeryThinSpace":" ","Vfr":"𝔙","vfr":"𝔳","vltri":"⊲","vnsub":"⊂⃒","vnsup":"⊃⃒","Vopf":"𝕍","vopf":"𝕧","vprop":"∝","vrtri":"⊳","Vscr":"𝒱","vscr":"𝓋","vsubnE":"⫋︀","vsubne":"⊊︀","vsupnE":"⫌︀","vsupne":"⊋︀","Vvdash":"⊪","vzigzag":"⦚","Wcirc":"Ŵ","wcirc":"ŵ","wedbar":"⩟","Wedge":"⋀","wedge":"∧","wedgeq":"≙","weierp":"℘","Wfr":"𝔚","wfr":"𝔴","Wopf":"𝕎","wopf":"𝕨","wp":"℘","wr":"≀","wreath":"≀","Wscr":"𝒲","wscr":"𝓌","xcap":"⋂","xcirc":"◯","xcup":"⋃","xdtri":"▽","Xfr":"𝔛","xfr":"𝔵","xhArr":"⟺","xharr":"⟷","Xi":"Ξ","xi":"ξ","xlArr":"⟸","xlarr":"⟵","xmap":"⟼","xnis":"⋻","xodot":"⨀","Xopf":"𝕏","xopf":"𝕩","xoplus":"⨁","xotime":"⨂","xrArr":"⟹","xrarr":"⟶","Xscr":"𝒳","xscr":"𝓍","xsqcup":"⨆","xuplus":"⨄","xutri":"△","xvee":"⋁","xwedge":"⋀","Yacute":"Ý","yacute":"ý","YAcy":"Я","yacy":"я","Ycirc":"Ŷ","ycirc":"ŷ","Ycy":"Ы","ycy":"ы","yen":"¥","Yfr":"𝔜","yfr":"𝔶","YIcy":"Ї","yicy":"ї","Yopf":"𝕐","yopf":"𝕪","Yscr":"𝒴","yscr":"𝓎","YUcy":"Ю","yucy":"ю","Yuml":"Ÿ","yuml":"ÿ","Zacute":"Ź","zacute":"ź","Zcaron":"Ž","zcaron":"ž","Zcy":"З","zcy":"з","Zdot":"Ż","zdot":"ż","zeetrf":"ℨ","ZeroWidthSpace":"​","Zeta":"Ζ","zeta":"ζ","Zfr":"ℨ","zfr":"𝔷","ZHcy":"Ж","zhcy":"ж","zigrarr":"⇝","Zopf":"ℤ","zopf":"𝕫","Zscr":"𝒵","zscr":"𝓏","zwj":"‍","zwnj":"‌"};

export class EvidenceError extends Error {
  constructor(code, message) { super(message); this.name = 'EvidenceError'; this.code = code; }
}
const failure = (code, message) => new EvidenceError(code, message);
const abortReason = signal => signal?.reason instanceof Error ? signal.reason : new DOMException('Source check aborted.', 'AbortError');
const bounded = (value, maximum) => Number.isFinite(value) ? Math.max(1, Math.min(Math.floor(value), maximum)) : maximum;

function ipv6Number(address) {
  const halves = address.toLowerCase().split('::');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const parts = halves.length === 2 ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right] : left;
  return parts.reduce((n, word) => (n << 16n) + BigInt(`0x${word}`), 0n);
}
const prefix6 = (value, base, bits) => value >> BigInt(128 - bits) === ipv6Number(base) >> BigInt(128 - bits);

export function isPublicAddress(address) {
  const family = isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) || (a === 192 && b === 88 && c === 99) ||
      (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113));
  }
  if (family !== 6 || address.includes('.') || address.includes('%')) return false;
  const value = ipv6Number(address);
  // Allow global unicast only; exclude special-purpose, documentation and transition ranges.
  return prefix6(value, '2000::', 3) && !prefix6(value, '2001::', 23) &&
    !prefix6(value, '2001:db8::', 32) && !prefix6(value, '2002::', 16) &&
    !prefix6(value, '3fff::', 20);
}

export function validateSourceURL(input) {
  if (typeof input !== 'string' || input.length > 8192) throw failure('BLOCKED', 'Invalid or oversized source URL.');
  const raw = input.trim();
  if (!/^https:\/\//i.test(raw) || /[\x00-\x20\x7f\\]/.test(raw)) throw failure('BLOCKED', 'Only well-formed HTTPS source URLs are allowed.');
  let url;
  try { url = new URL(raw); } catch { throw failure('BLOCKED', 'Invalid source URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || raw.split('/')[2]?.includes('@') || (url.port && url.port !== '443')) {
    throw failure('BLOCKED', 'Source URLs cannot contain credentials or nonstandard ports.');
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '');
  if (isIP(host)) {
    if (!isPublicAddress(host)) throw failure('BLOCKED', 'Private, local, reserved or transition IP addresses are blocked.');
  } else if (!host.includes('.') || host.includes('..') ||
    /(?:^|\.)(localhost|local|localdomain|internal|lan|test|invalid|example|onion)$/.test(host) ||
    host === 'home.arpa' || host.endsWith('.home.arpa') ||
    !host.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
    throw failure('BLOCKED', 'Local, reserved or malformed host names are blocked.');
  }
  url.hash = '';
  if (!isIP(host)) url.hostname = host;
  return {url, host};
}

function interruptible(promise, signal) {
  if (signal.aborted) return Promise.reject(abortReason(signal));
  return new Promise((resolve, reject) => {
    const abort = () => { cleanup(); reject(abortReason(signal)); };
    const cleanup = () => signal.removeEventListener('abort', abort);
    signal.addEventListener('abort', abort, {once: true});
    promise.then(value => { cleanup(); resolve(value); }, error => { cleanup(); reject(error); });
  });
}

function requestPinned(url, host, address, {request, signal, maxBytes}) {
  return new Promise((resolve, reject) => {
    let req, res, settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      if (error) { res?.destroy(); req?.destroy(); reject(error); }
      else resolve(value);
    };
    const onAbort = () => finish(abortReason(signal));
    if (signal.aborted) { reject(abortReason(signal)); return; }
    signal.addEventListener('abort', onAbort, {once: true});
    const pin = (hostname, options, callback) => {
      if (typeof options === 'function') { callback = options; options = {}; }
      if (hostname.toLowerCase().replace(/\.$/, '') !== host) { callback(failure('BLOCKED', 'Unexpected DNS host.')); return; }
      if (options?.all) callback(null, [{address: address.address, family: address.family}]);
      else callback(null, address.address, address.family);
    };
    try {
      req = request(url, {
        method: 'GET', agent: false, rejectUnauthorized: true, family: address.family, lookup: pin,
        ...(isIP(host) ? {} : {servername: host}),
        headers: {'User-Agent': 'ResearchRoundtable/0.3 (public-source-check)', 'Accept': 'text/html, text/plain, application/json, application/xhtml+xml', 'Accept-Encoding': 'identity'}
      }, incoming => {
        res = incoming;
        if (settled) { res.destroy(); return; }
        res.on('error', error => finish(error));
        const status = res.statusCode || 0;
        if (REDIRECTS.has(status)) {
          const location = res.headers.location;
          finish(null, {status, location});
          res.destroy();
          return;
        }
        if (status < 200 || status >= 300) { finish(failure('HTTP', `Public source returned HTTP ${status}.`)); return; }
        const contentType = String(res.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
        if (!['text/html', 'application/xhtml+xml', 'text/plain', 'application/json'].includes(contentType)) {
          finish(failure('UNSUPPORTED', contentType === 'application/pdf' ? 'PDF full text is not supported by this checker.' : 'This source is not readable HTML, plain text or JSON.'));
          return;
        }
        const encoding = String(res.headers['content-encoding'] || 'identity').toLowerCase();
        if (encoding !== 'identity') { finish(failure('UNSUPPORTED', 'Compressed content is not read by this checker.')); return; }
        const length = res.headers['content-length'];
        if (length && (!/^\d+$/.test(String(length)) || Number(length) > maxBytes)) { finish(failure('SIZE', 'Source exceeds the 1 MB retrieval limit.')); return; }
        let size = 0;
        const chunks = [];
        res.on('data', chunk => {
          if (settled) return;
          const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          size += bytes.length;
          if (size > maxBytes) { finish(failure('SIZE', 'Source exceeds the 1 MB retrieval limit.')); return; }
          chunks.push(bytes);
        });
        res.on('aborted', () => finish(failure('NETWORK', 'Public source closed before retrieval completed.')));
        res.on('close', () => { if (!settled && !res.complete) finish(failure('NETWORK', 'Public source closed before retrieval completed.')); });
        res.on('end', () => finish(null, {status, contentType, body: Buffer.concat(chunks).toString('utf8')}));
      });
      req.on('error', error => finish(error));
      req.end();
    } catch (error) { finish(error); }
  });
}

// Injection is for isolated tests; production always uses native HTTPS and system DNS.
export function createSafeFetcher({lookup = dnsLookup, request = https.request, timeoutMs = MAX_TIME, maxBytes = MAX_BYTES, maxRedirects = 3} = {}) {
  timeoutMs = bounded(timeoutMs, MAX_TIME);
  maxBytes = bounded(maxBytes, MAX_BYTES);
  maxRedirects = Math.max(0, Math.min(3, Number.isFinite(maxRedirects) ? Math.floor(maxRedirects) : 3));
  return async function safeFetch(input, {signal} = {}) {
    if (signal?.aborted) throw abortReason(signal);
    const control = new AbortController();
    const externalAbort = () => control.abort(abortReason(signal));
    signal?.addEventListener('abort', externalAbort, {once: true});
    const timer = setTimeout(() => control.abort(failure('TIMEOUT', 'Public source retrieval timed out after at most 12 seconds.')), timeoutMs);
    try {
      let next = input;
      for (let redirects = 0; ; redirects++) {
        const {url, host} = validateSourceURL(next);
        if (control.signal.aborted) throw abortReason(control.signal);
        let addresses;
        if (isIP(host)) addresses = [{address: host, family: isIP(host)}];
        else addresses = await interruptible(Promise.resolve().then(() => lookup(host, {all: true, verbatim: true})), control.signal);
        if (!Array.isArray(addresses) || !addresses.length) throw failure('NETWORK', 'The source host has no usable DNS addresses.');
        if (addresses.some(a => !isPublicAddress(a.address) || a.family !== isIP(a.address))) {
          throw failure('BLOCKED', 'The source DNS response contains a private, local or reserved address.');
        }
        const result = await requestPinned(url, host, addresses[0], {request, signal: control.signal, maxBytes});
        if (!REDIRECTS.has(result.status)) return {...result, url: url.href};
        if (redirects >= maxRedirects) throw failure('REDIRECT', 'The source exceeded the limit of three redirects.');
        if (typeof result.location !== 'string' || result.location.length > 8192) throw failure('BLOCKED', 'The source returned an invalid redirect.');
        if (/[\x00-\x20\x7f\\]/.test(result.location) || (/^(?:https?:)?\/\//i.test(result.location) && result.location.split('/')[2]?.includes('@'))) throw failure('BLOCKED', 'The source returned an unsafe redirect.');
        try { next = new URL(result.location, url).href; } catch { throw failure('BLOCKED', 'The source returned an invalid redirect.'); }
      }
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', externalAbort);
    }
  };
}

export function decodeEntities(input) {
  return String(input).replace(/&(#x[0-9a-f]+;?|#\d+;?|[a-z][a-z0-9]+;)/gi, (original, entity) => {
    const name = entity.replace(/;$/, '');
    if (!name.startsWith('#')) return entities[name] ?? original;
    const number = name[1]?.toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    if (!Number.isFinite(number) || number === 0 || number > 0x10ffff || (number >= 0xd800 && number <= 0xdfff)) return '\ufffd';
    return String.fromCodePoint(number);
  });
}
export const normalizeText = input => decodeEntities(input).normalize('NFC').replace(/\s+/gu, ' ').trim();
export const readableHTML = html => normalizeText(String(html)
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, ' ')
  .replace(/<[^>]*>/g, ' '));

function normalizedDOI(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  let doi = value.trim().replace(/^doi:\s*/i, '');
  if (/^https:\/\/(?:dx\.)?doi\.org\//i.test(doi)) {
    try { doi = decodeURIComponent(new URL(doi).pathname.slice(1)); } catch { return null; }
  }
  return /^10\.\d{4,9}\/[^\s<>"?#]{1,1800}$/i.test(doi) ? doi.toLowerCase() : null;
}
const canonicalDOI = doi => `https://doi.org/${doi.split('/').map(encodeURIComponent).join('/')}`;
function dateFrom(record) {
  const parts = (record.published || record['published-print'] || record['published-online'] || record.issued)?.['date-parts']?.[0];
  if (!Array.isArray(parts) || parts.length < 1 || parts.length > 3 || parts.some(p => !Number.isInteger(p)) || parts[0] < 1000 || parts[0] > 9999 || (parts.length > 1 && (parts[1] < 1 || parts[1] > 12)) || (parts.length > 2 && (parts[2] < 1 || parts[2] > new Date(Date.UTC(parts[0], parts[1], 0)).getUTCDate()))) return null;
  return parts.map((p, i) => i ? String(p).padStart(2, '0') : String(p)).join('-');
}
const snippet = (text, quote) => {
  const start = quote ? Math.max(0, text.indexOf(quote) - 80) : 0;
  return text.slice(start, start + 400);
};
function errorNote(error) {
  return error instanceof EvidenceError ? error.message : 'The public source could not be retrieved (network or response error).';
}
const caveat = 'Retrieval and exact text matching do not verify claim support, study quality or applicability.';

export function createSourceChecker({fetchText = createSafeFetcher(), now = () => new Date(), timeoutMs = MAX_TIME} = {}) {
  timeoutMs = bounded(timeoutMs, MAX_TIME);
  return async function sourceChecker(source, {signal} = {}) {
    if (signal?.aborted) throw abortReason(signal);
    const result = {status: 'unavailable', checkedAt: now().toISOString(), metadata: null, retrievedUrl: null, access: 'unavailable', quoteMatch: null, note: ''};
    const control = new AbortController();
    const externalAbort = () => control.abort(abortReason(signal));
    signal?.addEventListener('abort', externalAbort, {once: true});
    const timer = setTimeout(() => control.abort(failure('TIMEOUT', 'Source checking timed out after at most 12 seconds.')), timeoutMs);
    const notes = [];
    let incomplete = false;
    try {
      source = source && typeof source === 'object' ? source : {};
      const url = typeof source.url === 'string' && source.url.trim() ? source.url.trim() : null;
      if (url) validateSourceURL(url);
      const doi = normalizedDOI(source.doi) || (url && normalizedDOI(url));
      const quote = typeof source.quote === 'string' ? normalizeText(source.quote) : '';
      if (quote.length > 20000) throw failure('SIZE', 'The supplied quote is too long to check.');
      if (source.doi && !doi) { notes.push('The supplied DOI is malformed and was not checked.'); incomplete = true; }
      if (doi) {
        try {
          const response = await interruptible(Promise.resolve().then(() => fetchText(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {signal: control.signal})), control.signal);
          if (control.signal.aborted) throw abortReason(control.signal);
          const json = JSON.parse(response.body);
          const record = json.message;
          if (normalizedDOI(record?.DOI) !== doi) throw failure('METADATA', 'Crossref did not return a matching DOI record.');
          result.metadata = {
            title: Array.isArray(record.title) && typeof record.title[0] === 'string' ? readableHTML(record.title[0]).slice(0, 2000) : null,
            doi, publishedAt: dateFrom(record), type: typeof record.type === 'string' ? record.type.slice(0, 100) : null, url: canonicalDOI(doi)
          };
          result.retrievedUrl = response.url;
          result.access = 'metadata'; result.status = 'partial';
          notes.push('Crossref bibliographic metadata was retrieved; this alone does not verify the citation\'s claims.');
          if (typeof source.title === 'string' && source.title.trim() && result.metadata.title && normalizeText(source.title).toLowerCase() !== result.metadata.title.toLowerCase()) {
            notes.push('The Crossref title differs from the supplied title.'); incomplete = true;
          }
          const abstract = typeof record.abstract === 'string' ? readableHTML(record.abstract) : '';
          if (abstract) {
            result.access = 'abstract';
            result.quoteMatch = quote ? abstract.includes(quote) : null;
            result.excerpt = snippet(abstract, result.quoteMatch ? quote : '');
            result.status = result.quoteMatch === false || incomplete ? 'partial' : 'checked';
            notes.push('Only the deposited abstract was read; full text was not read.');
          } else if (quote) notes.push('No abstract or full text was available from Crossref for quote matching.');
        } catch (error) {
          if (signal?.aborted) throw abortReason(signal);
          notes.push(errorNote(error)); incomplete = true;
          if (error.code === 'BLOCKED') { result.status = 'blocked'; result.note = [...notes, caveat].join(' '); return result; }
        }
      }
      if (url) {
        try {
          const response = await interruptible(Promise.resolve().then(() => fetchText(url, {signal: control.signal})), control.signal);
          if (control.signal.aborted) throw abortReason(control.signal);
          const content = response.contentType === 'text/html' || response.contentType === 'application/xhtml+xml' ? readableHTML(response.body) : normalizeText(response.body);
          if (!content) throw failure('EMPTY', 'The source contained no readable text.');
          if (!result.metadata) {
            const title = response.contentType.includes('html') ? /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(response.body)?.[1] : null;
            result.metadata = {title: title ? readableHTML(title).slice(0, 2000) : null, doi: null, publishedAt: null, type: response.contentType === 'application/json' ? 'json' : 'webpage', url: response.url};
          }
          result.retrievedUrl = response.url; result.access = 'webpage';
          result.quoteMatch = quote ? content.includes(quote) : null;
          result.status = result.quoteMatch === false || incomplete ? 'partial' : 'checked';
          result.excerpt = snippet(content, result.quoteMatch ? quote : '');
          notes.push('Public page text was retrieved without executing page scripts.');
        } catch (error) {
          if (signal?.aborted) throw abortReason(signal);
          notes.push(errorNote(error));
          if (error.code === 'BLOCKED') result.status = 'blocked';
          else result.status = result.metadata ? 'partial' : 'unavailable';
        }
      }
      if (!url && !doi) notes.push('No valid public source URL or DOI was supplied.');
      if (result.quoteMatch === true) notes.push('The quote matches the retrieved text after HTML entity and whitespace normalization.');
      else if (result.quoteMatch === false) notes.push('The quote was not found in the text retrieved; this does not establish what an unread full text contains.');
      else if (!quote) notes.push('No quote was supplied for exact text matching.');
      result.note = [...notes, caveat].join(' ');
      return result;
    } catch (error) {
      if (signal?.aborted) throw abortReason(signal);
      result.status = error.code === 'BLOCKED' ? 'blocked' : result.metadata ? 'partial' : 'unavailable';
      result.note = [...notes, errorNote(error), caveat].join(' ');
      return result;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', externalAbort);
    }
  };
}

const defaultChecker = createSourceChecker();
export async function checkSource(source, options = {}) { return defaultChecker(source, options); }
