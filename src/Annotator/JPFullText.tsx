import { useState, useContext, useRef, memo } from "react";
import { LawContext } from "./App";
import { Container, Row, Col, Overlay, Accordion } from "react-bootstrap";
import { TextHighlighter, getArticleStatus } from "./Annotator";

type JPFullTextProps = {
  selectedLaw: string;
  targetedArticleNum?: string;
  relation: Set<string>;
  dispatch: React.Dispatch<DispatchAction>;
  textHighlighterOption: TextHighlighterOption;
};
const JPFullText = (props: JPFullTextProps) => {
  const law = useContext(LawContext) as Law;

  // console.log("rendering FullText");
  return (
    <div id="fulltext">
      {(
        law.content[props.selectedLaw] as JPLawXML
      ).LawBody.MainProvision.Chapter.map((chapter: ChapterXML, i: number) => {
        return (
          <Chapter key={i} chapter={chapter} {...props} lang="ja"></Chapter>
        );
      })}
    </div>
  );
};
export default JPFullText;

type ChapterProps = {
  selectedLaw: string;
  chapter: ChapterXML;
  targetedArticleNum?: string;
  relation: Set<string>;
  dispatch: React.Dispatch<DispatchAction>;
  textHighlighterOption: TextHighlighterOption;
  lang: "ja" | "en";
};

const Chapter = (props: ChapterProps) => {
  // console.log("rendering Chapter");
  const { chapter, ...childProps } = props;

  return (
    <div id={`chapter${props.chapter.$.Num}`}>
      {props.lang === "ja" && (
        <h2>
          <TextHighlighter
            text={props.chapter.ChapterTitle}
            textHighlighterOption={props.textHighlighterOption}
          ></TextHighlighter>
        </h2>
      )}
      {props.lang === "en" && (
        <h2>
          <TextHighlighter
            text={props.chapter.ChapterTitleEn}
            textHighlighterOption={props.textHighlighterOption}
          ></TextHighlighter>
        </h2>
      )}
      {props.chapter.Section &&
        props.chapter.Section.map((section: SectionXML, i: number) => {
          return <Section key={i} section={section} {...childProps}></Section>;
        })}
      {!props.chapter.Section &&
        props.chapter.Article!.map((article: ArticleXML, i: number) => {
          return (
            <JPArticle
              selectedLaw={props.selectedLaw}
              key={i}
              article={article}
              articleStatus={getArticleStatus(
                props.relation,
                article.$.Num,
                props.targetedArticleNum
              )}
              dispatch={props.dispatch}
              textHighlighterOption={props.textHighlighterOption}
              lang={props.lang}
            ></JPArticle>
          );
        })}
    </div>
  );
};

type SectionProps = {
  selectedLaw: string;
  section: SectionXML;
  targetedArticleNum?: string;
  relation: Set<string>;
  dispatch: React.Dispatch<DispatchAction>;
  textHighlighterOption: TextHighlighterOption;
  lang: "ja" | "en";
};
const Section = (props: SectionProps) => {
  // console.log(props.section);
  // console.log("rendering Section");

  return (
    <div id={`section${props.section.$.Num}`}>
      <h3>
        <TextHighlighter
          text={props.section.SectionTitle}
          textHighlighterOption={props.textHighlighterOption}
        ></TextHighlighter>
      </h3>
      {props.section.Article.map((article: ArticleXML, i: number) => {
        return (
          <JPArticle
            key={i}
            selectedLaw={props.selectedLaw}
            article={article}
            articleStatus={getArticleStatus(
              props.relation,
              article.$.Num,
              props.targetedArticleNum
            )}
            dispatch={props.dispatch}
            textHighlighterOption={props.textHighlighterOption}
            lang={props.lang}
          ></JPArticle>
        );
      })}
    </div>
  );
};

type JPArticleProps = {
  selectedLaw: string;
  article: ArticleXML;
  articleStatus: ArticleStatus;
  dispatch: React.Dispatch<DispatchAction>;
  textHighlighterOption: TextHighlighterOption;
  lang: "ja" | "en";
};
export const JPArticle = memo((props: JPArticleProps) => {
  // console.log(props);
  // console.log(`rendering Article ${props.article.$.Num}`);
  // console.log(`rendering Article`);

  const [showMenu, setShowMenu] = useState(false);
  const menuTarget = useRef(null);
  const childProps = {
    lang: props.lang,
    sentenceGenerator: getSentenceGenerator(props.textHighlighterOption),
  };

  let className = "";
  if (props.articleStatus === "target") {
    className += " TOCArticleTargeted";
  } else if (props.articleStatus === "labeled") {
    className += " articleLabeled";
  }

  return (
    <div id={`article${props.article.$.Num}`} className={`article${className}`}>
      <div>
        {/* キャプション */}
        <div className="articleCaption">
          {props.lang === "ja" && (
            <TextHighlighter
              text={props.article.ArticleCaption}
              textHighlighterOption={props.textHighlighterOption}
            ></TextHighlighter>
          )}
          {props.lang === "en" && (
            <TextHighlighter
              text={props.article.ArticleCaptionEn!}
              textHighlighterOption={props.textHighlighterOption}
            ></TextHighlighter>
          )}
        </div>

        {/* 以下、条文の内容 最初のParagraphとそれ以降で分けて考える*/}

        {/* まずは最初のParagraph */}
        <div className="paragraphBlock">
          <span
            className="articleTitle text-primary"
            ref={menuTarget}
            onClick={() => setShowMenu(!showMenu)}
          >
            {props.lang === "ja" && props.article.ArticleTitle}
            {props.lang === "en" && props.article.ArticleTitleEn}
          </span>
          <ArticleMenu
            selectedLaw={props.selectedLaw}
            target={menuTarget.current}
            showMenu={showMenu}
            setShowMenu={setShowMenu}
            articleNum={props.article.$.Num}
            dispatch={props.dispatch}
          ></ArticleMenu>
          {props.lang === "ja" && (
            <ParagraphSentence
              {...childProps}
              paragraphSentence={props.article.Paragraph[0]!.ParagraphSentence}
            ></ParagraphSentence>
          )}
          {props.lang === "en" && (
            <ParagraphSentence
              {...childProps}
              paragraphSentence={
                props.article.Paragraph[0]!.ParagraphSentenceEn
              }
            ></ParagraphSentence>
          )}

          {props.article.Paragraph[0]!.Item.map((item: ItemXML, i: number) => {
            return <Item key={i} {...childProps} item={item}></Item>;
          })}
        </div>

        {/* ２番目以降のParagraph */}
        {props.article.Paragraph.length > 1 &&
          props.article.Paragraph.slice(1).map(
            (paragraph: ParagraphXML, i: number) => {
              return (
                <div key={i} className="paragraphBlock">
                  <span className="paragraphNum">
                    {props.lang === "ja" && paragraph.ParagraphSentence.$.Num}
                    {props.lang === "en" && paragraph.ParagraphSentenceEn.$.Num}
                  </span>
                  {props.lang === "ja" && (
                    <ParagraphSentence
                      {...childProps}
                      paragraphSentence={paragraph.ParagraphSentence}
                    ></ParagraphSentence>
                  )}
                  {props.lang === "en" && (
                    <ParagraphSentence
                      {...childProps}
                      paragraphSentence={paragraph.ParagraphSentenceEn}
                    ></ParagraphSentence>
                  )}

                  {paragraph.Item.map((item: ItemXML, i: number) => {
                    return <Item key={i} {...childProps} item={item}></Item>;
                  })}
                </div>
              );
            }
          )}
        <Chikujo
          selectedLaw={props.selectedLaw}
          articleNum={props.article.$.Num}
          textHighlighterOption={props.textHighlighterOption}
        ></Chikujo>
      </div>
    </div>
  );
});

type ArticleMenuProps = {
  selectedLaw: string;
  target: any;
  showMenu: boolean;
  setShowMenu: React.Dispatch<React.SetStateAction<boolean>>;
  articleNum: string;
  dispatch: React.Dispatch<DispatchAction>;
};
export const ArticleMenu = memo((props: ArticleMenuProps) => {
  // console.log("rendering ArticleMenu");
  return (
    <Overlay
      target={props.target}
      show={props.showMenu}
      placement="bottom-start"
    >
      {({ placement, arrowProps, show: _show, popper, ...props2 }) => (
        <div {...props2} className="articleMenu">
          <Container>
            <Row>
              {[
                ["bg-secondary", "target"],
                ["bg-primary", "addArticle"],
                ["bg-success", "deleteArticle"],
              ].map(([className, actionName]) => {
                return (
                  <Col
                    key={`${className}_${actionName}`}
                    className={className}
                    onClick={() => {
                      props.dispatch({
                        type: actionName as
                          | "target"
                          | "addArticle"
                          | "deleteArticle",
                        selectedLaw: props.selectedLaw,
                        articleNum: props.articleNum,
                      });
                      props.setShowMenu(!props.showMenu);
                    }}
                  >
                    {actionName.replace("Article", "")}
                  </Col>
                );
              })}
            </Row>
          </Container>
        </div>
      )}
    </Overlay>
  );
});

type ChikujoProps = {
  selectedLaw: string;
  articleNum: string;
  textHighlighterOption: TextHighlighterOption;
};
export const Chikujo = memo((props: ChikujoProps) => {
  // console.log("rendering Chikujo");
  const law = useContext(LawContext) as Law;
  const content = (law.content[props.selectedLaw] as JPLawXML).Chikujo[
    props.articleNum
  ];
  if (content) {
    return (
      // <Accordion defaultActiveKey="0">
      <Accordion>
        <Accordion.Item eventKey="0">
          <Accordion.Header>逐条解説</Accordion.Header>
          <Accordion.Body>
            <pre>
              <TextHighlighter
                text={content}
                textHighlighterOption={props.textHighlighterOption}
              ></TextHighlighter>
            </pre>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    );
  } else {
    return <span>no content</span>;
  }
});

// type ParagraphProps = {
//   paragraph: ParagraphXML;
//   lang: "ja" | "en";
//   sentenceGenerator: (props: SentenceProps) => JSX.Element;
// };
// const Paragraph = memo((props: ParagraphProps) => {
//   // console.log(props.paragraph);
//   // console.log("rendering Paragraph")
//   const { paragraph, ...childProps } = props;

//   return (
//     <>
//       <span className="paragraph">
//         {Array.isArray(props.paragraph.ParagraphSentence) &&
//           props.paragraph.ParagraphSentence.map(
//             (paragraphSentence: ParagraphSentenceXML, i: number) => {
//               return (
//                 <ParagraphSentence
//                   key={i}
//                   {...childProps}
//                   paragraphSentence={paragraphSentence}
//                 ></ParagraphSentence>
//               );
//             }
//           )}
//         {!Array.isArray(props.paragraph.ParagraphSentence) && (
//           <ParagraphSentence
//             {...childProps}
//             paragraphSentence={props.paragraph.ParagraphSentence}
//           ></ParagraphSentence>
//         )}
//       </span>
//       {props.paragraph.Item &&
//         Array.isArray(props.paragraph.Item) &&
//         props.paragraph.Item.map((item: ItemXML, i: number) => {
//           return <Item key={i} {...childProps} item={item}></Item>;
//         })}
//       {props.paragraph.Item && !Array.isArray(props.paragraph.Item) && (
//         <Item {...childProps} item={props.paragraph.Item}></Item>
//       )}
//     </>
//   );
// });

type ParagraphSentenceProps = {
  paragraphSentence: ParagraphSentenceXML;
  lang: "ja" | "en";
  sentenceGenerator: (props: SentenceProps) => JSX.Element;
};
export const ParagraphSentence = memo((props: ParagraphSentenceProps) => {
  // console.log(props.paragraphSentence);

  const { paragraphSentence, ...childProps } = props;
  return (
    <span>
      {Array.isArray(props.paragraphSentence.Sentence) &&
        props.paragraphSentence.Sentence.map(
          (sentence: SentenceXML, i: number) => {
            return (
              <props.sentenceGenerator
                key={i}
                {...childProps}
                sentence={sentence}
              ></props.sentenceGenerator>
            );
          }
        )}
      {!Array.isArray(props.paragraphSentence.Sentence) && (
        <props.sentenceGenerator
          {...childProps}
          sentence={props.paragraphSentence.Sentence}
        ></props.sentenceGenerator>
      )}
    </span>
  );
});

type ItemProps = {
  item: ItemXML;
  lang: "ja" | "en";
  sentenceGenerator: (props: SentenceProps) => JSX.Element;
};
export const Item = memo((props: ItemProps) => {
  // console.log(props.item);

  const { item, ...childProps } = props;
  return (
    <div className="item">
      <span className="itemTitle">
        {props.lang === "ja" && props.item.ItemTitle}
        {props.lang === "en" && props.item.ItemTitleEn}
      </span>
      {props.lang === "ja" && (
        <ItemSentence
          {...childProps}
          itemSentence={props.item.ItemSentence}
        ></ItemSentence>
      )}
      {props.lang === "en" && (
        <ItemSentence
          {...childProps}
          itemSentence={props.item.ItemSentenceEn}
        ></ItemSentence>
      )}
    </div>
  );
});

type ItemSentenceProps = {
  itemSentence: ItemSentenceXML;
  lang: "ja" | "en";
  sentenceGenerator: (props: SentenceProps) => JSX.Element;
};
const ItemSentence = memo((props: ItemSentenceProps) => {
  // console.log(props.itemSentence);

  const { itemSentence, ...childProps } = props;
  let sentence: any = <></>;
  if (props.itemSentence.Sentence) {
    if (Array.isArray(props.itemSentence.Sentence)) {
      sentence = props.itemSentence.Sentence.map(
        (sentence: SentenceXML, i: number) => {
          return (
            <props.sentenceGenerator
              key={i}
              {...childProps}
              sentence={sentence}
            ></props.sentenceGenerator>
          );
        }
      );
    } else {
      sentence = (
        <props.sentenceGenerator
          {...childProps}
          sentence={props.itemSentence.Sentence}
        ></props.sentenceGenerator>
      );
    }
  }

  let column: any = <></>;
  if (props.itemSentence.Column) {
    if (Array.isArray(props.itemSentence.Column)) {
      column = props.itemSentence.Column.map((column: ColumnXML, i: number) => {
        return <Column key={i} {...childProps} column={column}></Column>;
      });
    } else {
      column = (
        <Column {...childProps} column={props.itemSentence.Column}></Column>
      );
    }
  }
  return (
    <>
      {sentence}
      {column}
    </>
  );
});

type ColumnProps = {
  column: ColumnXML;
  lang: "ja" | "en";
  sentenceGenerator: (props: SentenceProps) => JSX.Element;
};
const Column = memo((props: ColumnProps) => {
  // console.log(props.column);
  const { column, ...childProps } = props;
  return (
    <span className="column">
      {Array.isArray(props.column.Sentence) &&
        props.column.Sentence.map((sentence: SentenceXML, i: number) => {
          // return (
          //   <Sentence key={i} {...childProps} sentence={sentence}></Sentence>
          // );
          return (
            <props.sentenceGenerator
              sentence={sentence}
            ></props.sentenceGenerator>
          );
        })}
      {!Array.isArray(props.column.Sentence) && (
        <props.sentenceGenerator
          {...childProps}
          sentence={props.column.Sentence}
        ></props.sentenceGenerator>
      )}
    </span>
  );
});

type SentenceProps = {
  sentence: SentenceXML;
};

const getSentenceGenerator = (textHighlighterOption: TextHighlighterOption) => {
  return (props: { sentence: SentenceXML }) => {
    return (
      <TextHighlighter
        text={props.sentence._}
        textHighlighterOption={textHighlighterOption}
      ></TextHighlighter>
    );
  };
};
