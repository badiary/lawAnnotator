import React, { useState, useContext, useRef, memo } from "react";
import { LawContext } from "./App";
import { CommonProps, getArticleStatus } from "./Annotator";
import { ArticleMenu } from "./FullTextJP";
import { TextHighlighter, TextHighlighterOption } from "./spectrum";
import { text } from "stream/consumers";

interface FullTextEPProps extends Omit<CommonProps, "relation"> {
  relatedArticleNumSet: Set<string>;
}
const FullTextEP = (props: FullTextEPProps) => {
  const law = useContext(LawContext) as Law;

  // console.log("rendering FullText");
  return (
    <>
      {(law.content["epc"] as EPLawXML).en.articleArr.map(
        (article, i: number) => {
          const articleStatus = getArticleStatus(
            props.relatedArticleNumSet,
            article.articleNum,
            props.targetedArticleNum
          );
          return (
            <React.Fragment key={i}>
              <ArticleEP
                selectedLaw={props.selectedLaw}
                article={article}
                articleStatus={articleStatus}
                textHighlighterOption={props.textHighlighterOption}
                dispatch={props.dispatch}
              />
              <ArticleEPJA
                articleNum={article.articleNum}
                article={
                  (law.content["epc"] as EPLawXML).ja[article.articleNum]
                }
                articleStatus={articleStatus}
                textHighlighterOption={props.textHighlighterOption}
              />
            </React.Fragment>
          );
        }
      )}
    </>
  );
};
export default FullTextEP;

interface ArticleEPProps extends Omit<FullTextEPProps, "relatedArticleNumSet"> {
  article: {
    articleNum: string;
    articleCaption: string;
    content: string;
  };
  articleStatus: ArticleStatus;
}
// type ArticleENProps = {
//   selectedLaw: string;
//   article: {
//     articleNum: string;
//     articleCaption: string;
//     content: string;
//   };
//   articleStatus: ArticleStatus;
//   textHighlighterOption: TextHighlighterOption;
//   dispatch: React.Dispatch<DispatchAction>;
// };
const ArticleEP = memo((props: ArticleEPProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuTarget = useRef(null);

  let className = "";
  if (props.articleStatus === "target") {
    className += " TOCArticleTargeted";
  } else if (props.articleStatus === "labeled") {
    className += " articleLabeled";
  }

  const div = document.createElement("div");
  div.innerHTML = props.article.content;

  const contentElements = Array.from(div.childNodes).map((node, i) => {
    return (
      <React.Fragment key={i}>
        {getJSXElement(node, getSentenceGenerator(props.textHighlighterOption))}
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
        Article {props.article.articleNum} -{" "}
        <TextHighlighter
          text={props.article.articleCaption}
          textHighlighterOption={props.textHighlighterOption}
        />
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

type ArticleEPJAProps = {
  articleNum: string;
  article: { title: string; content: string };
  articleStatus: ArticleStatus;
  textHighlighterOption: TextHighlighterOption;
};
export const ArticleEPJA = memo((props: ArticleEPJAProps) => {
  let className = "";
  if (props.articleStatus === "target") {
    className += " TOCArticleTargeted";
  } else if (props.articleStatus === "labeled") {
    className += " articleLabeled";
  }

  const div = document.createElement("div");
  div.innerHTML = props.article.content;

  const contentElements = Array.from(div.childNodes).map((node, i) => {
    return (
      <React.Fragment key={i}>
        {getJSXElement(node, getSentenceGenerator(props.textHighlighterOption))}
      </React.Fragment>
    );
  });

  return (
    <div className={`article${className}`}>
      <span style={{ fontWeight: "bold" }}>
        <TextHighlighter
          text={props.article.title}
          textHighlighterOption={props.textHighlighterOption}
        />
      </span>
      <div>{contentElements}</div>
    </div>
  );
});

interface SentenceSimpleProps {
  content: string;
  sentenceID?: string;
}

const getSentenceGenerator = (textHighlighterOption: TextHighlighterOption) => {
  return (props: SentenceSimpleProps) => {
    return (
      <TextHighlighter
        text={props.content}
        textHighlighterOption={textHighlighterOption}
      />
    );
  };
};

export const getJSXElement = (
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

