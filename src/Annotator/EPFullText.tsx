import React, { useState, useContext, useRef, memo } from "react";
import { GlobalDataContext } from "./App";
import { Container, Row, Col, Overlay, Accordion } from "react-bootstrap";
import { TextHighlighter, getArticleStatus } from "./Annotator";

type EPFullTextProps = {
  targetedArticleNum?: string;
  relation: Set<string>;
  dispatch: React.Dispatch<DispatchAction>;
  textHighlighterOption: TextHighlighterOption;
};
const EPFullText = (props: EPFullTextProps) => {
  const globalData = useContext(GlobalDataContext) as GlobalData;

  // console.log("rendering FullText");
  return (
    <div id="fulltext">
      {globalData.epc.en.map((art: any, i: number) => {
        return (
          <React.Fragment key={i}>
            <ArticleEN
              article={art}
              textHighlighterOption={props.textHighlighterOption}
            />
            <ArticleJA
              articleNum={art.articleNum}
              article={globalData.epc.ja[art.articleNum]}
              textHighlighterOption={props.textHighlighterOption}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
};
export default EPFullText;

type ArticleENProps = {
  article: any;
  textHighlighterOption: TextHighlighterOption;
};
export const ArticleEN = memo((props: ArticleENProps) => {
  return (
    <div>
      <h5>
        Article {props.article.articleNum} - {props.article.artCaption}
      </h5>
      <div>{props.article.content}</div>
    </div>
  );
});

type ArticleJAProps = {
  articleNum: string;
  article: { title: string; content: string };
  // articleStatus: ArticleStatus;
  // dispatch: React.Dispatch<DispatchAction>;
  textHighlighterOption: TextHighlighterOption;
};
export const ArticleJA = memo((props: ArticleJAProps) => {
  // console.log(props);
  // console.log(`rendering Article ${props.article.$.Num}`);
  // console.log(`rendering Article`);

  // const childProps = {
  //   lang: props.lang,
  //   sentenceGenerator: getSentenceGenerator(props.textHighlighterOption),
  // };

  let className = "";
  // if (props.articleStatus === "target") {
  //   className += " TOCArticleTargeted";
  // } else if (props.articleStatus === "labeled") {
  //   className += " articleLabeled";
  // }

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
    <div id={`article${props.articleNum}`} className={`article${className}`}>
      <h5>{props.article.title}</h5>
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
    if (node.nodeName === "DL") {
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
          {Array.from(node.childNodes).map((childNode, i) => {
            return (
              <React.Fragment key={i}>
                {getJSXElement(childNode, textHighlighterOption)}
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
          {Array.from(node.childNodes).map((childNode, i) => {
            return (
              <React.Fragment key={i}>
                {getJSXElement(childNode, textHighlighterOption)}
              </React.Fragment>
            );
          })}
        </li>
      );
    }
  }

  console.log("error?");
  return <></>;
};
