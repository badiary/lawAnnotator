import { useContext } from "react";
import { LawContext } from "./App";
import { TextHighlighter, getArticleStatus } from "./Annotator";

let lang: "ja" | "en" = "en";
lang = "ja";
// lang = "en";
type TOCProps = {
  targetedArticleNum?: string;
  relation: Set<string>;
  textHighlighterOption: TextHighlighterOption;
};
function TOC(props: TOCProps) {
  const law = useContext(LawContext) as LawXML;

  return (
    <div id="TOC">
      {law.LawBody.MainProvision.Chapter.map(
        (chapter: ChapterXML, i: number) => {
          return (
            <Chapter
              key={i}
              chapter={chapter}
              targetedArticleNum={props.targetedArticleNum}
              relation={props.relation}
              textHighlighterOption={props.textHighlighterOption}
            ></Chapter>
          );
        }
      )}
    </div>
  );
}

type ChapterProps = {
  chapter: ChapterXML;
  targetedArticleNum?: string;
  relation: Set<string>;
  textHighlighterOption: TextHighlighterOption;
};
function Chapter(props: ChapterProps) {
  // console.log(props.chapter);

  return (
    <div id={`TOCChapter${props.chapter.$.Num}`}>
      <h4>
        <TextHighlighter
          text={
            lang === "ja"
              ? props.chapter.ChapterTitle
              : props.chapter.ChapterTitleEn
          }
          textHighlighterOption={props.textHighlighterOption}
        ></TextHighlighter>
      </h4>

      {props.chapter.Section &&
        props.chapter.Section.map((section: SectionXML, i: number) => {
          return (
            <Section
              key={i}
              section={section}
              targetedArticleNum={props.targetedArticleNum}
              relation={props.relation}
              textHighlighterOption={props.textHighlighterOption}
            ></Section>
          );
        })}
      {!props.chapter.Section &&
        props.chapter.Article!.map((article: ArticleXML, i: number) => {
          return (
            <Article
              key={i}
              article={article}
              articleStatus={getArticleStatus(
                props.relation,
                article.$.Num,
                props.targetedArticleNum
              )}
              textHighlighterOption={props.textHighlighterOption}
            ></Article>
          );
        })}
    </div>
  );
}

type SectionProps = {
  section: SectionXML;
  targetedArticleNum?: string;
  relation: Set<string>;
  textHighlighterOption: TextHighlighterOption;
};
function Section(props: SectionProps) {
  // console.log(props.section);
  return (
    <div id={`TOCsection${props.section.$.Num}`} className="TOCSection">
      <h5>
        <TextHighlighter
          text={
            lang === "ja"
              ? props.section.SectionTitle
              : props.section.SectionTitleEn
          }
          textHighlighterOption={props.textHighlighterOption}
        ></TextHighlighter>
      </h5>

      {props.section.Article.map((article: ArticleXML, i: number) => {
        return (
          <Article
            key={i}
            article={article}
            articleStatus={getArticleStatus(
              props.relation,
              article.$.Num,
              props.targetedArticleNum
            )}
            textHighlighterOption={props.textHighlighterOption}
          ></Article>
        );
      })}
    </div>
  );
}

type ArticleProps = {
  article: ArticleXML;
  articleStatus: ArticleStatus;
  textHighlighterOption: TextHighlighterOption;
};
function Article(props: ArticleProps) {
  // console.log(props.article);

  const onClickArticle = (articleNum: string) => {
    document.getElementById(`article${articleNum}`)?.scrollIntoView();
  };

  let className = "";
  if (props.articleStatus === "target") {
    className += " TOCArticleTargeted";
  } else if (props.articleStatus === "labeled") {
    className += " articleLabeled";
  }

  return (
    <div
      id={`TOCarticle${props.article.$.Num}`}
      className={`TOCArticle${className}`}
    >
      <div>
        <span
          className="TOCArticleTitle text-primary"
          onClick={() => onClickArticle(props.article.$.Num)}
        >
          {lang === "ja" && props.article.ArticleTitle}
          {lang === "en" && props.article.ArticleTitleEn}
        </span>
        {props.article.ArticleCaption && (
          <span className="TOCArticleCaption">
            <TextHighlighter
              text={
                lang === "ja"
                  ? props.article.ArticleCaption
                  : props.article.ArticleCaptionEn!
              }
              textHighlighterOption={props.textHighlighterOption}
            ></TextHighlighter>
          </span>
        )}
      </div>
    </div>
  );
}

export default TOC;
