import React, { useState, useContext, useRef, forwardRef, memo } from "react";
import { LawContext } from "./App";
import { Container, Row, Col } from "react-bootstrap";
import { TextHighlighter } from "./Annotator";
import { TextAnnotateMulti } from "@badiary/react-text-annotate-multi";
import { EPArticleJA } from "./EPFullText";
import { ArticleMenu } from "./JPFullText";

interface SentenceGeneratorProps {
  selectedLaw: string;
  labelName: string;
  targetedArticleNum?: string;
  pairedArticleNum?: string;
  articleNum: string;
  dispatch: React.Dispatch<DispatchAction>;
  textLabel: {
    [articleNumPair: string]: { [sentenceID: string]: TextLabelUnit[] };
  };
  textHighlighterOption: TextHighlighterOption;
}
type EPTextAnnotatorProps = {
  selectedLaw: string;
  targetedArticleNum?: string;
  pairedArticleNum?: string;
  relation: {
    [articleNum: string]: Set<string>;
  };
  textLabel: {
    [articleNumPair: string]: { [sentenceID: string]: TextLabelUnit[] };
  };
  dispatch: React.Dispatch<DispatchAction>;
  textHighlighterOption: TextHighlighterOption;
};
const EPTextAnnotator = forwardRef((props: EPTextAnnotatorProps, ref) => {
  // @ts-ignore
  const { targetedArticleEl, labeledArticleEl } = ref.current;
  const [selectedLabelName, setSelectedLabelName] =
    useState<LabelName>("definition");
  const [labelNameIndex, setLabelNameIndex] = useState("1");
  const labeledArticleNums =
    props.targetedArticleNum && props.relation[props.targetedArticleNum]
      ? props.relation[props.targetedArticleNum]
      : new Set<string>();
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
            <Col ref={targetedArticleEl}>
              <TargetedArticle
                selectedLaw={props.selectedLaw}
                labelName={`${selectedLabelName}${labelNameIndex}`}
                targetedArticleNum={props.targetedArticleNum}
                pairedArticleNum={props.pairedArticleNum}
                textLabel={props.textLabel}
                dispatch={props.dispatch}
                textHighlighterOption={props.textHighlighterOption}
              ></TargetedArticle>
            </Col>
          </Row>

          <Row className="h-50">
            <Col ref={labeledArticleEl}>
              <LabeledArticle
                selectedLaw={props.selectedLaw}
                labelName={`${LabelNameConverter[selectedLabelName]}${labelNameIndex}`}
                targetedArticleNum={props.targetedArticleNum}
                pairedArticleNum={props.pairedArticleNum}
                articleNums={labeledArticleNums}
                textLabel={props.textLabel}
                dispatch={props.dispatch}
                textHighlighterOption={props.textHighlighterOption}
              ></LabeledArticle>
            </Col>
          </Row>
        </Container>
      </Row>
    </Container>
  );
});

type TargetedArticleProps = {
  selectedLaw: string;
  labelName: string;
  targetedArticleNum?: string;
  pairedArticleNum?: string;

  textLabel: {
    [articleNumPair: string]: { [sentenceID: string]: TextLabelUnit[] };
  };
  dispatch: React.Dispatch<DispatchAction>;
  textHighlighterOption: TextHighlighterOption;
};
function TargetedArticle(props: TargetedArticleProps) {
  const law = useContext(LawContext) as Law;

  return (
    <div id="targetedArticle">
      {props.targetedArticleNum && (
        <>
          <ArticleT
            selectedLaw={props.selectedLaw}
            labelName={props.labelName}
            targetedArticleNum={props.targetedArticleNum}
            pairedArticleNum={props.pairedArticleNum}
            articleNum={props.targetedArticleNum}
            dispatch={props.dispatch}
            textLabel={props.textLabel}
            article={
              (law.content["epc"] as EPLawXML).en.articleObj[
                props.targetedArticleNum
              ]
            }
            articleStatusText="target"
            textHighlighterOption={props.textHighlighterOption}
          />
          <EPArticleJA
            articleNum={props.targetedArticleNum}
            article={
              (law.content["epc"] as EPLawXML).ja[props.targetedArticleNum]
            }
            articleStatus="target"
            textHighlighterOption={props.textHighlighterOption}
          />
        </>
      )}
    </div>
  );
}

type LabeledArticleProps = {
  selectedLaw: string;
  labelName: string;
  targetedArticleNum?: string;
  pairedArticleNum?: string;
  articleNums: Set<string>;
  textLabel: {
    [articleNumPair: string]: { [sentenceID: string]: TextLabelUnit[] };
  };
  dispatch: React.Dispatch<DispatchAction>;
  textHighlighterOption: TextHighlighterOption;
};
function LabeledArticle(props: LabeledArticleProps) {
  const { articleNums, ...childProps } = props;
  const law = useContext(LawContext) as Law;
  return (
    <div id="labeledArticle">
      {Array.from(props.articleNums)
        .sort(sortArticleNum)
        .map((articleNum) => {
          return (
            <div key={articleNum}>
              <ArticleT
                articleNum={articleNum}
                article={
                  (law.content["epc"] as EPLawXML).en.articleObj[articleNum]
                }
                articleStatusText={getArticleStatusText(
                  articleNum,
                  props.targetedArticleNum,
                  props.pairedArticleNum
                )}
                {...childProps}
                pairedArticleNum={articleNum} // childPropsより下に書かないと上書きされてしまう
              ></ArticleT>
            </div>
          );
        })}
    </div>
  );
}

interface ArticleTProps extends SentenceGeneratorProps {
  articleStatusText: ArticleStatusText;
  article: {
    articleNum: string;
    articleCaption: string;
    content: string;
  };
}
const ArticleT = memo((props: ArticleTProps) => {
  console.log(props.article);
  const [showMenu, setShowMenu] = useState(false);
  const menuTarget = useRef(null);

  let className = "";
  if (props.articleStatusText === "target") {
    className += " TOCArticleTargeted";
  } else if (props.articleStatusText === "paired") {
    className += " articleLabeled";
  }

  const div = document.createElement("div");
  div.innerHTML = props.article.content;

  const contentElements = Array.from(div.childNodes).map((node, i) => {
    return (
      <React.Fragment key={i}>
        {getJSXElement(node, {
          selectedLaw: props.selectedLaw,
          labelName: props.labelName,
          articleNum: props.articleNum,
          dispatch: props.dispatch,
          textLabel: props.textLabel,
          textHighlighterOption: props.textHighlighterOption,
          targetedArticleNum: props.targetedArticleNum,
          pairedArticleNum: props.pairedArticleNum,
        })}
      </React.Fragment>
    );
  });

  return (
    <div
      id={`article${props.article.articleNum}`}
      className={`article${className}`}
    >
      <span
        style={{ fontWeight: "bold", cursor: "pointer", color: "blue" }}
        ref={menuTarget}
        onClick={() => setShowMenu(!showMenu)}
      >
        Article {props.article.articleNum} - {props.article.articleCaption}
      </span>
      <ArticleMenu
        selectedLaw={props.selectedLaw}
        target={menuTarget.current}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
        articleNum={props.article.articleNum}
        dispatch={props.dispatch}
      ></ArticleMenu>
      <div>{contentElements}</div>
    </div>
  );
});

// TODO! アルファベットに対応させる
const sortArticleNum = (
  articleNum1: string,
  articleNum2: string
): 1 | 0 | -1 => {
  const nums1 = articleNum1.split("-");
  const nums2 = articleNum2.split("-");
  if (Number(nums1[0]) < Number(nums2[0])) {
    return -1;
  } else if (Number(nums1[0]) > Number(nums2[0])) {
    return 1;
  }
  // 以下、最初の数字が同じパターン
  if (nums1.length === 1 && nums2.length === 1) {
    return 0;
  }
  if (nums1.length === 1) {
    return -1;
  }
  if (nums2.length === 1) {
    return 1;
  }

  return sortArticleNum(nums1.slice(1).join("-"), nums2.slice(1).join("-"));
};

export default EPTextAnnotator;
type ArticleStatusText = "none" | "target" | "paired";
const getArticleStatusText = (
  articleNum: string,
  targetedArticleNum: string | undefined,
  pairedArticleNum: string | undefined
): ArticleStatusText => {
  if (articleNum === targetedArticleNum) {
    return "target";
  }
  if (articleNum === pairedArticleNum) {
    return "paired";
  }
  return "none";
};

interface SentenceProps extends SentenceGeneratorProps {
  sentenceID?: string;
  content: string;
}
const Sentence = memo((props: SentenceProps) => {
  console.log(props);
  if (!props.sentenceID) {
    return <span>{props.content}</span>;
  }
  // console.log("rendering Sentence");

  const articleNumPair = [props.targetedArticleNum, props.pairedArticleNum]
    .sort()
    .join(",");
  // console.log({ articleNumPair, sentenceID });

  const textLabels =
    props.textLabel[articleNumPair] &&
    props.textLabel[articleNumPair][props.sentenceID!]
      ? props.textLabel[articleNumPair][props.sentenceID!]
      : [];
  return (
    <TextAnnotateMulti
      text={props.content}
      updateLabelUnits={(textLabels: TextLabelUnit[]) => {
        const action: DispatchAction = {
          type: "text",
          articleNum: props.articleNum,
          text: {
            sentenceID: props.sentenceID!,
            textLabels: textLabels,
          },
          selectedLaw: props.selectedLaw,
        };
        props.dispatch(action);
      }}
      labelUnits={textLabels}
      labelName={props.labelName}
      getBackgroungColor={getBackgroungColor}
      textElementGenerator={(text: string) => {
        return (
          <TextHighlighter
            text={text}
            textHighlighterOption={props.textHighlighterOption}
          ></TextHighlighter>
        );
      }}
    />
  );
});

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

const getBackgroungColor = (labelNames: Set<string>): string => {
  const muitiLabeledColor = "#c8c8c8";

  let bgColor = muitiLabeledColor;

  if (labelNames.size === 1) {
    const labelName = Array.from(labelNames)[0].replace(/[0-9]+$/, "");
    if (labelName in COLORS) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      bgColor = COLORS[labelName];
    } else {
      // console.log("not found", labelName);
    }
  } else {
    // console.log("size not equal to 1", labelNames);
  }
  // console.log({ bgColor });
  return bgColor;
};

// const getSentenceGenerator = (
//   sentenceGeneratorProps: SentenceGeneratorProps
// ) => {
//   return (props: { sentence: SentenceXML }) => {
//     return <Sentence sentence={props.sentence} {...sentenceGeneratorProps} />;
//   };
// };

// TODO 将来的にはsentene generatorを渡したい
const getJSXElement = (
  node: Node,
  props: {
    selectedLaw: string;
    labelName: string;
    articleNum: string;
    dispatch: React.Dispatch<DispatchAction>;
    textLabel: {
      [articleNumPair: string]: { [sentenceID: string]: TextLabelUnit[] };
    };
    textHighlighterOption: TextHighlighterOption;
    targetedArticleNum?: string;
    pairedArticleNum?: string;
    sentenceID?: string;
  }
) => {
  if (node.nodeType === 3) {
    return <Sentence content={node.textContent!} {...props} />;
  } else {
    if (node.nodeName === "BR") {
      return <></>;
    } else if (node.nodeName === "DL") {
      return (
        <dl className="epc">
          {Array.from(node.childNodes).map((childNode, i) => {
            return (
              <React.Fragment key={i}>
                {getJSXElement(childNode, props)}
              </React.Fragment>
            );
          })}
        </dl>
      );
    } else if (node.nodeName === "DT") {
      return (
        <dt>
          {Array.from(node.childNodes).map((childNode, i) => {
            return (
              <React.Fragment key={i}>
                {getJSXElement(childNode, props)}
              </React.Fragment>
            );
          })}
        </dt>
      );
    } else if (node.nodeName === "DD") {
      return (
        <dd>
          {Array.from(node.childNodes).map((childNode, i) => {
            return (
              <React.Fragment key={i}>
                {getJSXElement(childNode, props)}
              </React.Fragment>
            );
          })}
        </dd>
      );
    } else if (node.nodeName === "DIV") {
      return (
        <div>
          {Array.from(node.childNodes).map((childNode, i) => {
            return (
              <React.Fragment key={i}>
                {getJSXElement(childNode, props)}
              </React.Fragment>
            );
          })}
        </div>
      );
    } else if (node.nodeName === "UL") {
      return (
        <ul>
          {Array.from(node.childNodes).map((childNode, i) => {
            return (
              <React.Fragment key={i}>
                {getJSXElement(childNode, props)}
              </React.Fragment>
            );
          })}
        </ul>
      );
    } else if (node.nodeName === "LI") {
      return (
        <li>
          {Array.from(node.childNodes).map((childNode, i) => {
            return (
              <React.Fragment key={i}>
                {getJSXElement(childNode, props)}
              </React.Fragment>
            );
          })}
        </li>
      );
    } else if (node.nodeName === "SPAN") {
      const sentenceID = (node as Element).getAttribute("data-sentenceid")!;
      const newProps = { sentenceID, ...props };
      return (
        <span data-sentenceid={sentenceID}>
          {Array.from(node.childNodes).map((childNode, i) => {
            return (
              <React.Fragment key={i}>
                {getJSXElement(childNode, newProps)}
              </React.Fragment>
            );
          })}
        </span>
      );
    }
  }

  console.log("error?", node);
  return <></>;
};
