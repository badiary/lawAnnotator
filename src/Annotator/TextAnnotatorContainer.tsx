import React, { useContext, useEffect, useRef, useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { LawContext } from "./App";
import { CommonProps } from "./Annotator";
import { ArticleJP } from "./FullTextJP";
import { ArticleEPJA } from "./FullTextEP";
import {
  ArticleTextAnnotatorJP,
  ArticleTextAnnotatorEP,
} from "./ArticleTextAnnotator";
import { SpectrumCanvas } from "./spectrum";

interface TextAnnotatorContainerProps extends CommonProps {
  pairedArticleNum?: string;
  textLabel: {
    [articleNumPair: string]: { [sentenceID: string]: TextLabelUnit[] };
  };
}

const TextAnnotatorContainer = (props: TextAnnotatorContainerProps) => {
  const [selectedLabelName, setSelectedLabelName] =
    useState<LabelName>("definition");
  const [labelNameIndex, setLabelNameIndex] = useState("1");
  const labeledArticleNums =
    props.targetedArticleNum && props.relation[props.targetedArticleNum]
      ? props.relation[props.targetedArticleNum]
      : new Set<string>();

  const targetedArticleEl = useRef<HTMLDivElement>(null);
  const labeledArticleEl = useRef<HTMLDivElement>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <Container>
      <Row id="textAnnotatorMenu">
        <Col>
          Name:
          <select
            onChange={(e) => setSelectedLabelName(e.target.value as LabelName)}
          >
            {Object.keys(COLORS).map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </Col>
        <Col>
          Index:
          <select onChange={(e) => setLabelNameIndex(e.target.value)}>
            {[1, 2, 3, 4, 5].map((index) => (
              <option key={index} value={index}>
                {index}
              </option>
            ))}
          </select>
        </Col>
        <Col>pName: {LabelNameConverter[selectedLabelName]}</Col>
        <Col>pArt: {props.pairedArticleNum}</Col>
      </Row>
      <Row id="textAnnotatorMain">
        <Container id="refInfo">
          <Row className="h-50">
            <Col ref={targetedArticleEl} style={{ position: "relative" }}>
              <TargetedArticle
                selectedLaw={props.selectedLaw}
                labelName={`${selectedLabelName}${labelNameIndex}`}
                targetedArticleNum={props.targetedArticleNum}
                pairedArticleNum={props.pairedArticleNum}
                textLabel={props.textLabel}
                dispatch={props.dispatch}
                textHighlighterOption={props.textHighlighterOption}
              />
              {isLoaded && (
                <SpectrumCanvas
                  initialVisibility="visible"
                  parentContainer={targetedArticleEl.current}
                  childContainer={
                    targetedArticleEl.current?.children[0] as HTMLElement
                  }
                  selectedLaw={props.selectedLaw}
                  textHighlighterOption={props.textHighlighterOption}
                ></SpectrumCanvas>
              )}
            </Col>
          </Row>

          <Row className="h-50">
            <Col ref={labeledArticleEl} style={{ position: "relative" }}>
              <LabeledArticle
                selectedLaw={props.selectedLaw}
                labelName={`${LabelNameConverter[selectedLabelName]}${labelNameIndex}`}
                targetedArticleNum={props.targetedArticleNum}
                pairedArticleNum={props.pairedArticleNum}
                articleNums={labeledArticleNums}
                textLabel={props.textLabel}
                dispatch={props.dispatch}
                textHighlighterOption={props.textHighlighterOption}
              />
              {isLoaded && (
                <SpectrumCanvas
                  initialVisibility="visible"
                  parentContainer={labeledArticleEl.current}
                  childContainer={
                    labeledArticleEl.current?.children[0] as HTMLElement
                  }
                  selectedLaw={props.selectedLaw}
                  textHighlighterOption={props.textHighlighterOption}
                ></SpectrumCanvas>
              )}
            </Col>
          </Row>
        </Container>
      </Row>
    </Container>
  );
};

export default TextAnnotatorContainer;

interface TargetedArticleProps
  extends Omit<TextAnnotatorContainerProps, "relation"> {
  labelName: string;
}

const TargetedArticle = (props: TargetedArticleProps) => {
  const law = useContext(LawContext) as Law;

  return (
    <div id="targetedArticle">
      {props.targetedArticleNum && (
        <>
          {(props.selectedLaw === "jpPatent" ||
            props.selectedLaw === "jpUtil") && (
            <>
              <ArticleTextAnnotatorJP
                article={
                  (law.content[props.selectedLaw] as JPLawXML).Article[
                    props.targetedArticleNum
                  ]
                }
                articleStatus={"target"}
                articleNum={props.targetedArticleNum}
                {...props}
              />
              <ArticleJP
                article={
                  (law.content[props.selectedLaw] as JPLawXML).Article[
                    props.targetedArticleNum
                  ]
                }
                articleStatus={"target"}
                lang="ja"
                {...props}
              ></ArticleJP>
            </>
          )}
          {props.selectedLaw === "epc" && (
            <>
              <ArticleTextAnnotatorEP
                articleNum={props.targetedArticleNum}
                article={
                  (law.content["epc"] as EPLawXML).en.articleObj[
                    props.targetedArticleNum
                  ]
                }
                articleStatus="target"
                {...props}
              />
              <ArticleEPJA
                articleNum={props.targetedArticleNum}
                article={
                  (law.content["epc"] as EPLawXML).ja[props.targetedArticleNum]
                }
                articleStatus="target"
                textHighlighterOption={props.textHighlighterOption}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

const COLORS: { [labelName in LabelName]: string } = {
  definition: "GreenYellow",
  defined: "Lime",
  overwriting: "#ff9",
  overwritten: "#ff3",
};

const LabelNameConverter: { [labelName in LabelName]: string } = {
  definition: "defined",
  defined: "definition",
  overwriting: "overwritten",
  overwritten: "overwriting",
};

export const getBackgroungColor = (labelNames: Set<string>): string => {
  const muitiLabeledColor = "#c8c8c8";

  let bgColor = muitiLabeledColor;

  if (labelNames.size === 1) {
    const labelName = Array.from(labelNames)[0].replace(/[0-9]+$/, "");
    if (labelName in COLORS) {
      bgColor = COLORS[labelName as LabelName];
    } else {
      // console.log("not found", labelName);
    }
  } else {
    // console.log("size not equal to 1", labelNames);
  }
  // console.log({ bgColor });
  return bgColor;
};

interface LabeledArticleProps
  extends Omit<TextAnnotatorContainerProps, "relation"> {
  labelName: string;
  articleNums: Set<string>;
}
function LabeledArticle(props: LabeledArticleProps) {
  const law = useContext(LawContext) as Law;
  return (
    <div id="labeledArticle">
      {Array.from(props.articleNums)
        .sort(sortArticleNum)
        .map((articleNum) => {
          return (
            <div key={articleNum}>
              <>
                {(props.selectedLaw === "jpPatent" ||
                  props.selectedLaw === "jpUtil") && (
                  <ArticleTextAnnotatorJP
                    article={
                      (law.content[props.selectedLaw] as JPLawXML).Article[
                        articleNum
                      ]
                    }
                    articleStatus={getArticleStatus(
                      articleNum,
                      props.targetedArticleNum,
                      props.pairedArticleNum
                    )}
                    {...props}
                    articleNum={articleNum}
                    pairedArticleNum={articleNum} // childPropsより下に書かないと上書きされてしまう
                  />
                )}
                {props.selectedLaw === "epc" && (
                  <ArticleTextAnnotatorEP
                    article={
                      (law.content["epc"] as EPLawXML).en.articleObj[articleNum]
                    }
                    articleStatus={getArticleStatus(
                      articleNum,
                      props.targetedArticleNum,
                      props.pairedArticleNum
                    )}
                    {...props}
                    articleNum={articleNum}
                    pairedArticleNum={articleNum} // childPropsより下に書かないと上書きされてしまう
                  />
                )}
              </>
            </div>
          );
        })}
    </div>
  );
}

const sortArticleNum = (
  articleNum1: string,
  articleNum2: string
): 1 | 0 | -1 => {
  console.log({ articleNum1, articleNum2 });
  const num1 = articleNum1.match(/^[0-9]+/)![0];
  const num2 = articleNum2.match(/^[0-9]+/)![0];
  console.log({ num1, num2 });
  if (Number(num1) < Number(num2)) {
    return -1;
  } else if (Number(num1) > Number(num2)) {
    return 1;
  } else if (articleNum1 === articleNum2) {
    return 0;
  }

  // 以下、最初の数字が同じパターン
  console.log("JP");
  // まずはJP
  const nums1 = articleNum1.split("-");
  const nums2 = articleNum2.split("-");

  if (nums1.length > 1 && nums2.length > 1) {
    return sortArticleNum(nums1.slice(1).join("-"), nums2.slice(1).join("-"));
  }
  if (nums1.length > 1) return 1;
  if (nums2.length > 1) return -1;

  // 次にEP
  console.log("EP");
  console.log({ articleNum1, articleNum2 });
  const eng1 = articleNum1.match(/[a-z]+/);
  const eng2 = articleNum2.match(/[a-z]+/);
  if (!eng1) return -1;
  if (!eng2) return 1;
  if (eng1[0] === eng2[0]) return 0;
  if (eng1[0] < eng2[0]) return -1;
  if (eng1[0] > eng2[0]) return 1;

  throw new Error(`sort error (${articleNum1}, ${articleNum2})`);
};

const getArticleStatus = (
  articleNum: string,
  targetedArticleNum: string | undefined,
  pairedArticleNum: string | undefined
): ArticleStatus => {
  if (articleNum === targetedArticleNum) {
    return "target";
  }
  if (articleNum === pairedArticleNum) {
    return "paired";
  }
  return "none";
};
