// Local, deterministic intake. This module never calls a model or a network service.
const option=(value,labelZh,labelEn)=>({value,labelZh,labelEn});
export function clarificationPlan(input={}) {
 const decision=input.decision||{}, topic=input.topic||'general', questions=[];
 if(!String(decision.goal||'').trim()) questions.push({id:'decision_goal',field:'goal',
  titleZh:'這次研究主要要幫你做哪一類決定？',titleEn:'What decision should this research help you make?',
  options:topic==='technology'?[option('research','選擇研究方向','Choose a research direction'),option('skills','規劃職涯與學習','Plan career and learning'),option('understand','了解趨勢與影響','Understand trends and impacts')]:topic==='academic'?[option('direction','選擇研究題目','Choose a research question'),option('method','比較研究方法','Compare research methods'),option('evidence','釐清證據與研究缺口','Understand evidence and gaps')]:topic==='health'?[option('general','了解一般研究建議','Understand general evidence'),option('routine','調整日常習慣','Adjust everyday habits'),option('compare','比較可行做法','Compare practical options')]:[option('understand','釐清問題與證據','Understand the question and evidence'),option('choose','比較選項並決策','Compare options and decide'),option('plan','制定下一步計畫','Plan next steps')],
  assumptionZh:'未指定個人決策目標；先整理證據、分歧及可逆的下一步，不假定你的職涯、投資或治療目標。',
  assumptionEn:'No personal decision goal was supplied. Summarize evidence, disagreements and reversible next steps without assuming career, investment or treatment goals.'});
 if(!String(decision.constraints||'').trim()) questions.push({id:'decision_constraints',field:'constraints',
  titleZh:topic==='health'?'有什麼會影響建議適用性的背景或限制？只填你願意提供的資訊。':topic==='academic'?'研究有哪些資源或適用範圍限制？':'有什麼必須納入的資源、時間或適用範圍限制？',
  titleEn:topic==='health'?'What context or constraints affect applicability? Share only what you are comfortable providing.':topic==='academic'?'What resources or scope constraints should the research consider?':'What resource, time or scope constraints should be considered?',
  options:topic==='health'?[option('general','只討論一般成人研究','General adult evidence only'),option('low_cost','優先低成本日常做法','Prioritize low-cost everyday options')]:topic==='academic'?[option('explore','先探索，不假定設備或資料','Explore without assumed equipment or data'),option('public','優先公開資料與可重現方法','Prioritize public data and reproducible methods')]:[option('explore','先探索，不假定個人資源','Explore without assumed personal resources'),option('low_cost','優先低成本、可逆的選擇','Prioritize low-cost reversible options')],
  assumptionZh:topic==='health'?'個人背景與限制未提供；僅做一般研究整理，明列研究族群與適用限制，不推定個人健康狀況。':'個人資源與限制未提供；不假定預算、設備、能力或地區，建議需附適用條件。',
  assumptionEn:topic==='health'?'Personal context and constraints were not supplied. Provide general research with population and applicability limits; do not infer personal health conditions.':'Personal resources and constraints were not supplied. Do not assume budget, equipment, skills or location; make recommendations conditional.'});
 return {version:1,questions:questions.slice(0,2)};
}
export function applyClarification(input,submitted) {
 if(submitted==null)return input;
 if(typeof submitted!=='object'||Array.isArray(submitted)||submitted.version!==1)throw new Error('Invalid clarification version');
 const plan=clarificationPlan(input), known=new Map(plan.questions.map(q=>[q.id,q]));
 const answers=submitted.answers??{},skipped=submitted.skipped??[];
 if(typeof answers!=='object'||Array.isArray(answers)||!Array.isArray(skipped)||skipped.length>2||skipped.some(id=>!known.has(id))||Object.entries(answers).some(([id,text])=>!known.has(id)||typeof text!=='string'||text.length>2000))throw new Error('Invalid clarification answers');
 const decision={...input.decision},records=[];
 for(const q of plan.questions){const answer=(answers[q.id]||'').trim();if(answer&&skipped.includes(q.id))throw new Error('Clarification cannot be answered and skipped');
  const matched=q.options.find(o=>o.value===answer),english=input.answerLang==='en'||(input.answerLang==='auto'&&!/[\u3400-\u9fff]/u.test(input.question));
  if(answer)decision[q.field]=matched?(english?matched.labelEn:matched.labelZh):answer;
  records.push({id:q.id,field:q.field,titleZh:q.titleZh,titleEn:q.titleEn,answer:answer?decision[q.field]:null,submittedAnswer:answer||null,skipped:!answer,assumptionZh:answer?null:q.assumptionZh,assumptionEn:answer?null:q.assumptionEn});
 }
 return {...input,decision,clarification:{version:1,completedAt:new Date().toISOString(),records}};
}
export function clarificationInstructions(session){
 const records=session.clarification?.records;
 if(!Array.isArray(records)||!records.length)return '';
 return `\nPRE-RESEARCH CLARIFICATION (user answers and explicitly disclosed defaults, not verified facts):\n${JSON.stringify(records)}\nKeep skipped questions visible as assumptions. Do not turn missing personal context into a fact or silently personalize recommendations. If these assumptions materially affect the conclusion, explain how.\n`;
}
