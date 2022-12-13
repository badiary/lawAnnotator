import React, { useState, useRef, memo } from "react";
import { TextHighlighter } from "./spectrum";
import { TextAnnotateMulti } from "@badiary/react-text-annotate-multi";
import { ArticleMenu, Item, ParagraphSentence } from "./FullTextJP";
import { getBackgroungColor } from "./TextAnnotatorContainer";
import { CommonProps } from "./Annotator";

interface SentenceAnnotatorGeneratorProps
  extends Omit<CommonProps, "relation"> {
  labelName: string;
  pairedArticleNum?: string;
  articleNum: string;
  textLabel: {
    [articleNumPair: string]: { [sentenceID: string]: TextLabelUnit[] };
  };
}

export type SentenceAnnotatorGenerator = (
  props: SentenceAnnotatorGeneratorProps
) => JSX.Element;

interface ArticleTextAnnotatorJPProps extends SentenceAnnotatorGeneratorProps {
  article: ArticleXML;
  articleStatus: ArticleStatus;
}
// TODO memo?
export const ArticleTextAnnotatorJP = (props: ArticleTextAnnotatorJPProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuTarget = useRef(null);
  const { article, articleStatus, ...sentenceAnnotatorGeneratorProps } = props;
  const sentenceGenerator = getSentenceGenerator(
    sentenceAnnotatorGeneratorProps
  );

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
            selectedLaw={props.selectedLaw}
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
};

interface ArticleTextAnnotatorEPProps extends SentenceAnnotatorGeneratorProps {
  article: {
    articleNum: string;
    articleCaption: string;
    content: string;
  };
  articleStatus: ArticleStatus;
}
export const ArticleTextAnnotatorEP = memo(
  (props: ArticleTextAnnotatorEPProps) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuTarget = useRef(null);

    let className = "";
    if (props.articleStatus === "target") {
      className += " TOCArticleTargeted";
    } else if (props.articleStatus === "paired") {
      className += " articleLabeled";
    }

    const sentenceGenerator = getSentenceGenerator(props);

    const div = document.createElement("div");
    div.innerHTML = props.article.content;

    const contentElements = Array.from(div.childNodes).map((node, i) => {
      return (
        <React.Fragment key={i}>
          {getJSXElement(node, sentenceGenerator)}
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
  }
);

interface SentenceProps extends SentenceAnnotatorGeneratorProps {
  content: string;
  sentenceID?: string;
}
interface SentenceSimpleProps {
  content: string;
  sentenceID?: string;
}

// TODO memo?
const Sentence = (props: SentenceProps) => {
  // console.log("rendering Sentence");
  if (!props.sentenceID) {
    return (
      <TextHighlighter
        text={props.content}
        textHighlighterOption={props.textHighlighterOption}
      ></TextHighlighter>
    );
  }
  const articleNumPair = [props.targetedArticleNum, props.pairedArticleNum]
    .sort()
    .join(",");

  const textLabels =
    props.textLabel[articleNumPair] &&
    props.textLabel[articleNumPair][props.sentenceID]
      ? props.textLabel[articleNumPair][props.sentenceID]
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
};

const getSentenceGenerator = (
  sentenceGeneratorProps: SentenceAnnotatorGeneratorProps
) => {
  return (props: SentenceSimpleProps) => {
    return (
      <Sentence
        content={props.content}
        sentenceID={props.sentenceID}
        {...sentenceGeneratorProps}
      />
    );
  };
};

const getJSXElement = (
  node: Node,
  SentenceGenerator: (props: SentenceSimpleProps) => JSX.Element,
  sentenceID?: string
) => {
  if (node.nodeType === 3) {
    return (
      <SentenceGenerator content={node.textContent!} sentenceID={sentenceID} />
    );
  } else {
    if (node.nodeName === "BR") {
      return <></>;
    } else if (node.nodeName === "DL") {
      return (
        <dl className="epc">
          {Array.from(node.childNodes).map((childNode, i) => {
            return (
              <React.Fragment key={i}>
                {getJSXElement(childNode, SentenceGenerator, sentenceID)}
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
                {getJSXElement(childNode, SentenceGenerator, sentenceID)}
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
                {getJSXElement(childNode, SentenceGenerator, sentenceID)}
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
                {getJSXElement(childNode, SentenceGenerator, sentenceID)}
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
                {getJSXElement(childNode, SentenceGenerator, sentenceID)}
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
                {getJSXElement(childNode, SentenceGenerator, sentenceID)}
              </React.Fragment>
            );
          })}
        </li>
      );
    } else if (node.nodeName === "SPAN") {
      const newSentenceID = (node as Element).getAttribute("data-sentenceid")!;
      return (
        <span data-sentenceid={sentenceID}>
          {Array.from(node.childNodes).map((childNode, i) => {
            return (
              <React.Fragment key={i}>
                {getJSXElement(childNode, SentenceGenerator, newSentenceID)}
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
