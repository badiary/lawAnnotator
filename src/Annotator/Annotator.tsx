import React, {
  useContext,
  useReducer,
  useRef,
  useEffect,
  useState,
} from "react";
import { LawContext } from "./App";
import { Container, Row, Col } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Menu from "./Menu";
import { SpectrumCanvas, TextHighlighterOption } from "./spectrum";
import FullText from "./FullText";
import TextAnnotator from "./TextAnnotatorContainer";
export const articleHighlightItems = [];
// export const articleHighlightItems = [
//   {
//     word: "((?:第[〇一二三四五六七八九十百]+条(?:の[〇一二三四五六七八九十百]+)*(?:第[〇一二三四五六七八九十百]項)?(?:第[〇一二三四五六七八九十百]号)?)|(?:前[条項号](?:第[〇一二三四五六七八九十百][項号])*))",
//     style: { color: "green" },
//     callback: (text: string) => {
//       return (
//         <a
//           href="#1"
//           onClick={(e) => {
//             const articleTerm = text.match(
//               /第[〇一二三四五六七八九十百]+条(?:の[〇一二三四五六七八九十百]+)*/
//             );
//             if (articleTerm) {
//               document
//                 .getElementById(
//                   `article${articleTerm[0]
//                     .match(/[〇一二三四五六七八九十百]+/g)!
//                     .map(kanji2number)
//                     .join("_")}`
//                 )
//                 ?.scrollIntoView();
//             }
//           }}
//         >
//           {text}
//         </a>
//       );
//     },
//   },
//   {
//     word: "article [0-9]+[a-z]*",
//     style: { color: "green" },
//   },
// ];

export interface CommonProps {
  selectedLaw: string;
  targetedArticleNum?: string;
  relation: {
    [articleNum: string]: Set<string>;
  };
  dispatch: React.Dispatch<DispatchAction>;
  textHighlighterOption: TextHighlighterOption;
}

// type AnnotatorProps = {};
function Annotator() {
  console.log("rendering Annotator");
  const law = useContext<Law>(LawContext);

  const [textHighlighterOption, setTextHighlighterOption] =
    useState<TextHighlighterOption>({
      items: articleHighlightItems,
      query: "",
      coloredQuery: "",
      colorIndex: {},
    });

  const [lawStates, dispatch] = useReducer(reducer, getInitialLawStates(law));
  const [selectedLaw, setSelectedLaw] = useState("jpPatent");
  const [isLoaded, setIsLoaded] = useState(false);

  function reducer(
    lawStates: { [lawName: string]: LawState },
    action: DispatchAction
  ): { [lawName: string]: LawState } {
    console.log("action", { action, lawStates });
    // 再レンダリングを意識してオブジェクトを作り変えるのを忘れない！
    const newLawStates: { [lawName: string]: LawState } = { ...lawStates };

    switch (action.type) {
      case "load":
        const data = JSON.parse(action.json!);
        Object.entries(data.lawStates).forEach(([lawName, lawState]) => {
          // @ts-ignore
          Object.entries(lawState.relation).forEach(
            ([articleNum, articleNumArr]) => {
              // @ts-ignore
              lawState.relation[articleNum] = new Set<string>(articleNumArr);
            }
          );
        });
        // @ts-ignore
        return data.lawStates;

      case "target":
        if (!action.selectedLaw) return lawStates;
        if (
          lawStates[action.selectedLaw].targetedArticleNum === action.articleNum
        ) {
          return lawStates;
        }

        newLawStates[action.selectedLaw].targetedArticleNum = action.articleNum;
        newLawStates[action.selectedLaw].pairedArticleNum = undefined;
        return newLawStates;

      case "addArticle":
      case "deleteArticle": {
        if (!action.selectedLaw) return lawStates;
        if (!lawStates[action.selectedLaw].targetedArticleNum) {
          alert("Select an article to target first.");
          return lawStates;
        }
        if (
          lawStates[action.selectedLaw].targetedArticleNum === action.articleNum
        ) {
          alert("Cannot add / delete the targeted article itself.");
          return lawStates;
        }

        if (action.type === "addArticle") {
          newLawStates[action.selectedLaw].relation[
            lawStates[action.selectedLaw].targetedArticleNum!
          ].add(action.articleNum!);
          newLawStates[action.selectedLaw].relation[action.articleNum!].add(
            lawStates[action.selectedLaw].targetedArticleNum!
          );
          newLawStates[action.selectedLaw].pairedArticleNum = action.articleNum;
        } else if (action.type === "deleteArticle") {
          newLawStates[action.selectedLaw].relation[
            lawStates[action.selectedLaw].targetedArticleNum!
          ].delete(action.articleNum!);
          newLawStates[action.selectedLaw].relation[action.articleNum!].delete(
            lawStates[action.selectedLaw].targetedArticleNum!
          );
          const articleNumPair = [
            action.articleNum,
            lawStates[action.selectedLaw].targetedArticleNum,
          ]
            .sort()
            .join(",");
          newLawStates[action.selectedLaw].textLabel[articleNumPair] = {};
          if (
            action.articleNum === lawStates[action.selectedLaw].pairedArticleNum
          ) {
            newLawStates[action.selectedLaw].pairedArticleNum = undefined;
          }
        }

        // 再レンダリング処理
        newLawStates[action.selectedLaw].relation = {
          ...newLawStates[action.selectedLaw].relation,
        };

        return newLawStates;
      }

      case "text": {
        if (!action.selectedLaw) return lawStates;
        if (!action.text) return lawStates;

        if (!lawStates[action.selectedLaw].targetedArticleNum) {
          alert("Select targeted article.");
          return lawStates;
        }

        console.log(action.text);

        let articleNumPair: string;
        if (
          action.articleNum !== lawStates[action.selectedLaw].targetedArticleNum
        ) {
          // labeled articleのアノテーションの場合

          // pairedArticleNumが違っていたら更新して終わり
          if (
            action.articleNum !==
            newLawStates[action.selectedLaw].pairedArticleNum
          ) {
            newLawStates[action.selectedLaw].pairedArticleNum =
              action.articleNum;
            return newLawStates;
          }

          articleNumPair = [
            action.articleNum,
            lawStates[action.selectedLaw].targetedArticleNum,
          ]
            .sort()
            .join(",");
        } else if (
          lawStates[action.selectedLaw].pairedArticleNum &&
          lawStates[action.selectedLaw].pairedArticleNum !==
            lawStates[action.selectedLaw].targetedArticleNum
        ) {
          // targeted articleのアノテーションでちゃんとペアが設定されている場合
          articleNumPair = [
            lawStates[action.selectedLaw].pairedArticleNum,
            lawStates[action.selectedLaw].targetedArticleNum,
          ]
            .sort()
            .join(",");
        } else {
          alert("Select paired article.");
          return lawStates;
        }

        if (!newLawStates[action.selectedLaw].textLabel[articleNumPair]) {
          newLawStates[action.selectedLaw].textLabel[articleNumPair] = {};
        }
        newLawStates[action.selectedLaw].textLabel[articleNumPair][
          action.text.sentenceID
        ] = action.text.textLabels;

        // 再レンダリング処理
        newLawStates[action.selectedLaw].textLabel = {
          ...newLawStates[action.selectedLaw].textLabel,
        };
        newLawStates[action.selectedLaw].textLabel[articleNumPair] = {
          ...newLawStates[action.selectedLaw].textLabel[articleNumPair],
        };
        return newLawStates;
      }
      default:
        return lawStates;
    }
  }

  const fulltextEl = useRef<HTMLDivElement>(null);

  const downloadLabel = async () => {
    const data = {
      lawStates: { ...lawStates } as any,
    };
    Object.entries(lawStates).forEach(([lawName, lawState]) => {
      data.lawStates[lawName].relation = Object.entries(
        lawState.relation
      ).reduce(
        (
          prev: { [articleNum: string]: string[] },
          [articleNum, relatedArticleSet]
        ) => {
          prev[articleNum] = Array.from(relatedArticleSet);
          return prev;
        },
        {}
      );
    });

    const date = new Date();
    const dateStr =
      date.getFullYear() +
      "-" +
      ("0" + (date.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + date.getDate()).slice(-2) +
      "_" +
      ("0" + date.getHours()).slice(-2) +
      "-" +
      ("0" + date.getMinutes()).slice(-2) +
      "-" +
      ("0" + date.getSeconds()).slice(-2);

    // ソースコードを Blob オブジェクトに変換してURLを取得
    const blob = new Blob([JSON.stringify(data)]);
    const url = window.URL || window.webkitURL;
    const blobURL = url.createObjectURL(blob);

    // <a> を新たに作成し、ダウンロード用の設定をいろいろ
    const a = document.createElement("a");
    a.download = `label_${dateStr}.json`;
    a.href = blobURL;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    alert("ラベルデータをダウンロードしました。");
  };

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <Container id="main">
      <Row id="title">
        <Col>
          <ButtonGroup aria-label="Basic example">
            {Object.entries(law.info).map(([key, val]) => {
              if (key === selectedLaw) {
                return (
                  <Button key={key} variant="primary">
                    {val.name}
                  </Button>
                );
              } else {
                return (
                  <Button
                    key={key}
                    data-key={key}
                    variant="light"
                    onClick={(e) => {
                      const clickedKey = (
                        e.target as HTMLButtonElement
                      ).attributes.getNamedItem("data-key")!.value;
                      setSelectedLaw(clickedKey);
                    }}
                  >
                    {val.name}
                  </Button>
                );
              }
            })}
          </ButtonGroup>
        </Col>
        <Col>
          <Menu
            dispatch={dispatch}
            downloadLabel={downloadLabel}
            setTextHighlighterOption={setTextHighlighterOption}
            textHighlighterOption={textHighlighterOption}
          ></Menu>
        </Col>
      </Row>
      <Row id="lawViewer">
        <Container>
          <Row className="oneRow">
            <Col
              className="col-6"
              ref={fulltextEl}
              style={{ position: "relative" }}
            >
              <FullText
                selectedLaw={selectedLaw}
                targetedArticleNum={lawStates[selectedLaw].targetedArticleNum}
                relatedArticleNumSet={
                  lawStates[selectedLaw].targetedArticleNum
                    ? lawStates[selectedLaw].relation[
                        lawStates[selectedLaw].targetedArticleNum!
                      ]
                    : new Set<string>()
                }
                dispatch={dispatch}
                textHighlighterOption={textHighlighterOption}
              />

              {isLoaded && (
                <SpectrumCanvas
                  initialVisibility="visible"
                  parentContainer={fulltextEl.current}
                  childContainer={
                    fulltextEl.current?.children[0] as HTMLElement
                  }
                  selectedLaw={selectedLaw}
                  textHighlighterOption={textHighlighterOption}
                ></SpectrumCanvas>
              )}
            </Col>
            <Col>
              <TextAnnotator
                selectedLaw={selectedLaw}
                targetedArticleNum={lawStates[selectedLaw].targetedArticleNum}
                pairedArticleNum={lawStates[selectedLaw].pairedArticleNum}
                relation={lawStates[selectedLaw].relation}
                textLabel={lawStates[selectedLaw].textLabel}
                dispatch={dispatch}
                textHighlighterOption={textHighlighterOption}
              />
            </Col>
          </Row>
        </Container>
      </Row>
    </Container>
  );
}

export default Annotator;

const getInitialLawStates = (law: Law): { [lawName: string]: LawState } => {
  const initialLawStates: { [lawName: string]: LawState } = [
    "jpPatent",
    "jpUtil",
    "epc",
  ].reduce((prev: { [lawName: string]: LawState }, lawName) => {
    let initialRelation: { [articleNum: string]: Set<string> };
    if (lawName === "jpPatent" || lawName === "jpUtil") {
      initialRelation = Object.keys(
        (law.content[lawName] as JPLawXML).Article
      ).reduce((prev: { [articleNum: string]: Set<string> }, cur: string) => {
        prev[cur] = new Set<string>();
        return prev;
      }, {});
    } else {
      initialRelation = (law.content["epc"] as EPLawXML).en.articleArr.reduce(
        (prev: { [articleNum: string]: Set<string> }, cur) => {
          prev[cur.articleNum] = new Set<string>();
          return prev;
        },
        {}
      );
    }
    prev[lawName] = {
      relation: initialRelation,
      textLabel: {},
    };
    return prev;
  }, {});

  return initialLawStates;
};

export const getArticleStatus = (
  labeledArticleNums: Set<string>,
  articleNum: string,
  targetedArticleNum?: string
): ArticleStatus => {
  if (articleNum === targetedArticleNum) {
    return "target";
  }
  if (labeledArticleNums.has(articleNum)) {
    return "labeled";
  }
  return "none";
};
