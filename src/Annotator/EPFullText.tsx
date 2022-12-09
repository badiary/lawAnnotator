import React, { useState, useContext, useRef, memo } from "react";
import { LawContext } from "./App";
import { Container, Row, Col, Overlay, Accordion } from "react-bootstrap";
import { TextHighlighter, getArticleStatus } from "./Annotator";
import { TextAnnotateMulti } from "@badiary/react-text-annotate-multi";
import { ArticleMenu } from "./JPFullText";

type EPFullTextProps = {
  selectedLaw: string;
  targetedArticleNum?: string;
  relation: Set<string>;
  dispatch: React.Dispatch<DispatchAction>;
  textHighlighterOption: TextHighlighterOption;
};
const EPFullText = (props: EPFullTextProps) => {
  const law = useContext(LawContext) as Law;

  // console.log("rendering FullText");
  return (
    <div id="fulltext">
      {(law.content["epc"] as EPLawXML).en.articleArr.map(
        (article, i: number) => {
          const articleStatus = getArticleStatus(
            props.relation,
            article.articleNum,
            props.targetedArticleNum
          );
          return (
            <React.Fragment key={i}>
              <ArticleEN
                selectedLaw={props.selectedLaw}
                article={article}
                articleStatus={articleStatus}
                textHighlighterOption={props.textHighlighterOption}
                dispatch={props.dispatch}
              />
              <EPArticleJA
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
    </div>
  );
};
export default EPFullText;

type ArticleENProps = {
  selectedLaw: string;
  article: {
    articleNum: string;
    articleCaption: string;
    content: string;
  };
  articleStatus: ArticleStatus;
  textHighlighterOption: TextHighlighterOption;
  dispatch: React.Dispatch<DispatchAction>;
};
const ArticleEN = memo((props: ArticleENProps) => {
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
        {getJSXElement(node, props.textHighlighterOption)}
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

type EPArticleJAProps = {
  articleNum: string;
  article: { title: string; content: string };
  articleStatus: ArticleStatus;
  textHighlighterOption: TextHighlighterOption;
};
export const EPArticleJA = memo((props: EPArticleJAProps) => {
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
        {getJSXElement(node, props.textHighlighterOption)}
      </React.Fragment>
    );
  });

  return (
    <div className={`article${className}`}>
      <span style={{ fontWeight: "bold" }}>{props.article.title}</span>
      <div>{contentElements}</div>
    </div>
  );
});

// TODO 将来的にはsentene generatorを渡したい
const getJSXElement = (
  node: Node,
  textHighlighterOption: TextHighlighterOption
) => {
  if (node.nodeType === 3) {
    return (
      <TextHighlighter
        text={node.textContent!}
        textHighlighterOption={textHighlighterOption}
      ></TextHighlighter>
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
                {getJSXElement(childNode, textHighlighterOption)}
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
                {getJSXElement(childNode, textHighlighterOption)}
              </React.Fragment>
            );
          })}
        </dt>
      );
    } else if (node.nodeName === "DD") {
      return (
        <dd>
          <span
            data-sentenceid={(node as Element).getAttribute("data-sentenceid")}
          >
            {Array.from(node.childNodes).map((childNode, i) => {
              return (
                <React.Fragment key={i}>
                  {getJSXElement(childNode, textHighlighterOption)}
                </React.Fragment>
              );
            })}
          </span>
        </dd>
      );
    } else if (node.nodeName === "DIV") {
      return (
        <div>
          {Array.from(node.childNodes).map((childNode, i) => {
            return (
              <React.Fragment key={i}>
                {getJSXElement(childNode, textHighlighterOption)}
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
                {getJSXElement(childNode, textHighlighterOption)}
              </React.Fragment>
            );
          })}
        </ul>
      );
    } else if (node.nodeName === "LI") {
      return (
        <li>
          <span
            data-sentenceid={(node as Element).getAttribute("data-sentenceid")}
          >
            {Array.from(node.childNodes).map((childNode, i) => {
              return (
                <React.Fragment key={i}>
                  {getJSXElement(childNode, textHighlighterOption)}
                </React.Fragment>
              );
            })}
          </span>
        </li>
      );
    } else if (node.nodeName === "SPAN") {
      return (
        <span
          data-sentenceid={(node as Element).getAttribute("data-sentenceid")}
        >
          {Array.from(node.childNodes).map((childNode, i) => {
            return (
              <React.Fragment key={i}>
                {getJSXElement(childNode, textHighlighterOption)}
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
