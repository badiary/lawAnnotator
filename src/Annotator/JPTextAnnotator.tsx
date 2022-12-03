import React, { useState, useContext, useRef, forwardRef, memo } from "react";
import { GlobalDataContext } from "./App";
import { Container, Row, Col } from "react-bootstrap";
import { TextHighlighter } from "./Annotator";
import { TextAnnotateMulti } from "@badiary/react-text-annotate-multi";
import { Article, ArticleMenu, Item, ParagraphSentence } from "./JPFullText";

interface SentenceGeneratorProps {
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
type TextAnnotatorProps = {
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
const TextAnnotator = forwardRef((props: TextAnnotatorProps, ref) => {
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
  const globalData = useContext(GlobalDataContext) as GlobalData;

  return (
    <div id="targetedArticle">
      {props.targetedArticleNum && (
        <>
          <ArticleT
            article={
              globalData.jpLaw[props.selectedLaw].Article[
                props.targetedArticleNum
              ]
            }
            articleStatus={"target"}
            articleNum={props.targetedArticleNum}
            {...props}
          ></ArticleT>
          <Article
            article={
              globalData.jpLaw[props.selectedLaw].Article[
                props.targetedArticleNum
              ]
            }
            articleStatus={"target"}
            lang="ja"
            {...props}
          ></Article>
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
  const globalData = useContext(GlobalDataContext) as GlobalData;
  return (
    <div id="labeledArticle">
      {Array.from(props.articleNums)
        .sort(sortArticleNum)
        .map((articleNum) => {
          return (
            <div key={articleNum}>
              <ArticleT
                article={
                  globalData.jpLaw[props.selectedLaw].Article[articleNum]
                }
                articleStatus={getArticleStatus(
                  articleNum,
                  props.targetedArticleNum,
                  props.pairedArticleNum
                )}
                {...childProps}
                articleNum={articleNum}
                pairedArticleNum={articleNum} // childPropsより下に書かないと上書きされてしまう
              ></ArticleT>
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

export default TextAnnotator;
type ArticleStatus = "none" | "target" | "paired";
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
interface ArticleProps extends SentenceGeneratorProps {
  article: ArticleXML;
  articleStatus: ArticleStatus;
}
const ArticleT = memo((props: ArticleProps) => {
  // console.log(props);
  // console.log(`rendering Article ${props.article.$.Num}`);
  // console.log(`rendering Article`);

  const [showMenu, setShowMenu] = useState(false);
  const menuTarget = useRef(null);
  const { article, articleStatus, ...sentenceGeneratorProps } = props;
  const sentenceGenerator = getSentenceGenerator(sentenceGeneratorProps);

  let className = "";
  if (props.articleStatus === "target") {
    className += " TOCArticleTargeted";
  } else if (props.articleStatus === "paired") {
    className += " articlePaired";
  }

  return (
    <div id={`article${props.article.$.Num}`} className={`article${className}`}>
      <div>
        {/* キャプション */}
        <div className="articleCaption">
          <TextHighlighter
            text={props.article.ArticleCaptionEn!}
            textHighlighterOption={props.textHighlighterOption}
          ></TextHighlighter>
        </div>

        {/* 以下、条文の内容 最初のParagraphとそれ以降で分けて考える*/}

        {/* まずは最初のParagraph */}
        <div className="paragraphBlock">
          <span
            className="articleTitle text-primary"
            ref={menuTarget}
            onClick={() => setShowMenu(!showMenu)}
          >
            {props.article.ArticleTitleEn}
          </span>
          <ArticleMenu
            target={menuTarget.current}
            showMenu={showMenu}
            setShowMenu={setShowMenu}
            articleNum={props.article.$.Num}
            dispatch={props.dispatch}
          ></ArticleMenu>

          <ParagraphSentence
            paragraphSentence={props.article.Paragraph[0]!.ParagraphSentenceEn}
            lang="en"
            sentenceGenerator={sentenceGenerator}
          ></ParagraphSentence>

          {props.article.Paragraph[0]!.Item.map((item: ItemXML, i: number) => {
            return (
              <Item
                key={i}
                item={item}
                lang="en"
                sentenceGenerator={sentenceGenerator}
              ></Item>
            );
          })}
        </div>

        {/* ２番目以降のParagraph */}
        {props.article.Paragraph.length > 1 &&
          props.article.Paragraph.slice(1).map(
            (paragraph: ParagraphXML, i: number) => {
              return (
                <div key={i} className="paragraphBlock">
                  <span className="paragraphNum">
                    {paragraph.ParagraphSentenceEn.$.Num}
                  </span>
                  <ParagraphSentence
                    paragraphSentence={paragraph.ParagraphSentenceEn}
                    lang="en"
                    sentenceGenerator={sentenceGenerator}
                  ></ParagraphSentence>

                  {paragraph.Item.map((item: ItemXML, i: number) => {
                    return (
                      <Item
                        key={i}
                        item={item}
                        lang="en"
                        sentenceGenerator={sentenceGenerator}
                      ></Item>
                    );
                  })}
                </div>
              );
            }
          )}
      </div>
    </div>
  );
});

interface SentenceProps extends SentenceGeneratorProps {
  sentence: SentenceXML;
}
const Sentence = memo((props: SentenceProps) => {
  // console.log(props.sentence);
  // console.log("rendering Sentence");

  const articleNumPair = [props.targetedArticleNum, props.pairedArticleNum]
    .sort()
    .join(",");
  const sentenceID = props.sentence.$.Num;
  // console.log({ articleNumPair, sentenceID });

  const textLabels =
    props.textLabel[articleNumPair] &&
    props.textLabel[articleNumPair][sentenceID]
      ? props.textLabel[articleNumPair][sentenceID]
      : [];
  return (
    <TextAnnotateMulti
      text={props.sentence._}
      updateLabelUnits={(textLabels: TextLabelUnit[]) => {
        const action: DispatchAction = {
          type: "text",
          articleNum: props.articleNum,
          text: {
            sentenceID: sentenceID,
            textLabels: textLabels,
          },
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
  reference: "#f9f",
  referred: "#f3f",
  overwriting: "#ff9",
  overwritten: "#ff3",
};

const LabelNameConverter: { [labelName in LabelName]: string } = {
  definition: "defined",
  defined: "definition",
  reference: "referred",
  referred: "reference",
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

const getSentenceGenerator = (
  sentenceGeneratorProps: SentenceGeneratorProps
) => {
  return (props: { sentence: SentenceXML }) => {
    return <Sentence sentence={props.sentence} {...sentenceGeneratorProps} />;
  };
};
