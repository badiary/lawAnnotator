

// ------------------------------------------------------------------------

const tagConverter = {
  "definition": "defined",
  "defined": "definition",
  "overwriting": "overwritten",
  "overwritten": "overwriting"
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");
const basePath = "/Users/yhiguchi/Desktop/github/lawAnnotator/public/resource/EP/";
const articles = JSON.parse(
  fs.readFileSync(`${basePath}epcArticle.json`, "utf-8")
);
const baseLabel = JSON.parse(
  fs.readFileSync(`${basePath}label/label_base.json`, "utf-8")
);
const outputPath = `${basePath}label/epc.json`;


const additionalLabels = [{
  "sentenceID": "4-0",
  "textLabels": [
    {
      // "re": /\b((the|that|those|a|an) )?devices?\b/gi,
      "re": /\bthe Organisation\b/gi,
      "start": 32,
      "end": 75,
      "labelName": "definition",
      "text": "hereinafter referred to as the Organisation"
    }
  ]
},
{
  "sentenceID": "134a-1",
  "textLabels": [
    {
      "re": /\bthe Institute\b/gi,
      "start": 81,
      "end": 121,
      "labelName": "definition",
      "text": "hereinafter referred to as the Institute"
    }
  ]
},
{
  "sentenceID": "150-0",
  "textLabels": [
    {
      "re": /\bthe PCT\b/gi,
      "start": 47,
      "end": 81,
      "labelName": "definition",
      "text": "hereinafter referred to as the PCT"
    }
  ]
}];

for (const sidLabels of additionalLabels) {

  const tNum = sidLabels.sentenceID.split("-")[0];
  console.log(tNum);
  baseLabel.lawStates.epc.relation[tNum] = new Set(baseLabel.lawStates.epc.relation[tNum]);
  // console.log({ tNum });
  // 条文ごとにループ（自分自身の条文を弾きたい）
  for (const tmp of Object.entries(articles)) {
    const [articleNum, article] = tmp;
    if (articleNum === tNum) continue;

    const articleNumPair = [tNum, articleNum].sort()
      .join(",");
    console.log({ articleNumPair });

    // 追加すべきlabelUnitごとにループ
    for (const labelUnit of sidLabels.textLabels) {
      // console.log({ text: labelUnit.text });
      // 追加すべきラベルのindexを調べる
      let labelIndex = 1;
      if (baseLabel.lawStates.epc.textLabel[articleNumPair]) {
        let labels = new Set(Object.entries(baseLabel.lawStates.epc.textLabel[articleNumPair]).map(([sentenceID, labelUnits]) => {
          return labelUnits.filter((labelUnit) => {
            return labelUnit.labelName.indexOf("definition") !== -1;
          }).map((labelUnit) => {
            return labelUnit.labelName;
          });
        }).flat());
        labelIndex = labels.size + 1;
      }

      const sts = Object.entries(article);


      // art内のsentenceごとにループ
      for (const st of sts) {

        const sid = st[0];
        const content = st[1];


        // console.log({ sid, re: labelUnit.re, content });
        let mt;
        let tFlag = false;
        while ((mt = labelUnit.re.exec(content))) {
          console.log(mt);
          tFlag = true;

          // relation追加
          baseLabel.lawStates.epc.relation[tNum].add(articleNum);
          baseLabel.lawStates.epc.relation[articleNum] = new Set(baseLabel.lawStates.epc.relation[articleNum]);
          baseLabel.lawStates.epc.relation[articleNum].add(tNum);
          baseLabel.lawStates.epc.relation[articleNum] = Array.from(baseLabel.lawStates.epc.relation[articleNum]);

          // articleNumの方
          if (!baseLabel.lawStates.epc.textLabel[articleNumPair]) baseLabel.lawStates.epc.textLabel[articleNumPair] = {};
          if (!baseLabel.lawStates.epc.textLabel[articleNumPair][sid]) baseLabel.lawStates.epc.textLabel[articleNumPair][sid] = [];
          baseLabel.lawStates.epc.textLabel[articleNumPair][sid].push({
            start: mt.index,
            end: mt.index + mt[0].length,
            labelName: `${tagConverter[labelUnit.labelName.replace(/[0-9]+$/g, "")]}${labelIndex}`,
            text: mt[0]
          });
        }

        if (tFlag) {
          //tNumの方
          const tmpUnit = {
            start: labelUnit.start,
            end: labelUnit.end,
            labelName: `${tagConverter[labelUnit.labelName.replace(/[0-9]+$/g, "")]}${labelIndex}`,
            text: labelUnit.text,
          };
          if (!baseLabel.lawStates.epc.textLabel[articleNumPair][sidLabels.sentenceID]) baseLabel.lawStates.epc.textLabel[articleNumPair][sidLabels.sentenceID] = [];
          baseLabel.lawStates.epc.textLabel[articleNumPair][sidLabels.sentenceID].push(tmpUnit);
        }
      }
    }

  }
  baseLabel.lawStates.epc.relation[tNum] = Array.from(baseLabel.lawStates.epc.relation[tNum]);
}

fs.writeFileSync(outputPath, JSON.stringify(baseLabel));