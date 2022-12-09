import React, {
  useContext,
  useReducer,
  useRef,
  useEffect,
  useState,
} from "react";
import { LawContext } from "./App";
import JPTextAnnotator from "./JPTextAnnotator";
import { Container, Row, Col } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import JPFullText from "./JPFullText";
import EPFullText from "./EPFullText";
import Menu from "./Menu";
import hotkeys from "hotkeys-js";
import { kanji2number } from "@geolonia/japanese-numeral";
import * as satModules from "./sat";
import EPTextAnnotator from "./EPTextAnnotator";

type AnnotatorProps = {
  sat: satModules.Sat;
};
function Annotator(props: AnnotatorProps) {
  console.log("rendering Annotator");
  const law = useContext<Law>(LawContext);

  const [textHighlighterOption, setTextHighlighterOption] =
    useState<TextHighlighterOption>({
      words: [],
      className: {},
      query: "",
    });

  const [lawStates, dispatch] = useReducer(reducer, getInitialLawStates(law));
  const [selectedLaw, setSelectedLaw] = useState("jpPatent");

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
  const targetedArticleEl = useRef<HTMLDivElement>(null);
  const labeledArticleEl = useRef<HTMLDivElement>(null);
  const textAnnotatorEls = useRef({
    targetedArticleEl,
    labeledArticleEl,
  });
  useEffect(() => {
    Array.from(document.querySelectorAll("canvas")).forEach((cv) => {
      cv.parentNode?.removeChild(cv);
    });
    Array.from(document.querySelectorAll(".hide_spectrum_bar")).forEach(
      (div) => {
        div.parentNode?.removeChild(div);
      }
    );
    props.sat.initialize(
      [
        [fulltextEl.current!, "visible"],
        [targetedArticleEl.current!, "hidden"],
        [labeledArticleEl.current!, "hidden"],
      ],
      0.5,
      true,
      false
    );
    props.sat.word!.setOption({});
    setTextHighlighterOption({
      ...props.sat.word!.textHighlighterOption,
      query: "",
    });
    props.sat.cv!.draw();

    hotkeys("command+shift+f", (event: Event, _handler: any) => {
      event.preventDefault();
      function setCaretToEnd(target: HTMLElement) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(target);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
        target.focus();
        range.detach();
      }
      const div = document.getElementById("word_query")!;
      div.click();
      setCaretToEnd(div);
    });
  }, [selectedLaw]);

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
    if (props.sat.cv) {
      props.sat.cv.updateData();
      props.sat.cv.draw();
    } else {
      console.log("no sat cv!");
      console.log(props.sat);
    }
  }, [textHighlighterOption, selectedLaw]);

  return (
    <Container id="main">
      <Row id="title">
        <Col>
          <h4>
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
          </h4>
        </Col>
        <Col>
          <Menu
            dispatch={dispatch}
            sat={props.sat}
            downloadLabel={downloadLabel}
            setTextHighlighterOption={setTextHighlighterOption}
            textHighlighterOption={textHighlighterOption}
          ></Menu>
        </Col>
      </Row>
      <Row id="lawViewer">
        <Container>
          <Row className="oneRow">
            <Col className="col-6" ref={fulltextEl}>
              {(selectedLaw === "jpPatent" || selectedLaw === "jpUtil") && (
                <JPFullText
                  selectedLaw={selectedLaw}
                  targetedArticleNum={lawStates[selectedLaw].targetedArticleNum}
                  relation={
                    lawStates[selectedLaw].targetedArticleNum
                      ? lawStates[selectedLaw].relation[
                          lawStates[selectedLaw].targetedArticleNum!
                        ]
                      : new Set<string>()
                  }
                  dispatch={dispatch}
                  textHighlighterOption={textHighlighterOption}
                />
              )}
              {selectedLaw === "epc" && (
                <EPFullText
                  selectedLaw={selectedLaw}
                  targetedArticleNum={lawStates[selectedLaw].targetedArticleNum}
                  relation={
                    lawStates[selectedLaw].targetedArticleNum
                      ? lawStates[selectedLaw].relation[
                          lawStates[selectedLaw].targetedArticleNum!
                        ]
                      : new Set<string>()
                  }
                  dispatch={dispatch}
                  textHighlighterOption={textHighlighterOption}
                />
              )}
            </Col>
            <Col>
              {(selectedLaw === "jpPatent" || selectedLaw === "jpUtil") && (
                <JPTextAnnotator
                  selectedLaw={selectedLaw}
                  targetedArticleNum={lawStates[selectedLaw].targetedArticleNum}
                  pairedArticleNum={lawStates[selectedLaw].pairedArticleNum}
                  relation={lawStates[selectedLaw].relation}
                  textLabel={lawStates[selectedLaw].textLabel}
                  dispatch={dispatch}
                  textHighlighterOption={textHighlighterOption}
                  ref={textAnnotatorEls}
                />
              )}
              {selectedLaw === "epc" && (
                <EPTextAnnotator
                  selectedLaw={selectedLaw}
                  targetedArticleNum={lawStates[selectedLaw].targetedArticleNum}
                  pairedArticleNum={lawStates[selectedLaw].pairedArticleNum}
                  relation={lawStates[selectedLaw].relation}
                  textLabel={lawStates[selectedLaw].textLabel}
                  dispatch={dispatch}
                  textHighlighterOption={textHighlighterOption}
                  ref={textAnnotatorEls}
                />
              )}
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

type TextToHighlighterProps = {
  text: string;
  textHighlighterOption: TextHighlighterOption;
};
export const TextHighlighter = (props: TextToHighlighterProps) => {
  const chunks: { text: string; className: string }[] =
    props.textHighlighterOption.words.reduce(
      // 反転ワード毎にループ
      (prev: { text: string; className: string }[], currentWord) => {
        return prev
          .map(({ text, className }) => {
            // chunk毎にループ
            // 既にヒット済みのchunkなら無視
            if (className !== "") {
              return [{ text, className }];
            }

            // 正規表現のマッチ情報を元にtextの分割位置を取得
            let match: RegExpExecArray | null;
            const re = new RegExp(currentWord, "g");
            const matchedRanges: { start: number; end: number }[] = [];
            while ((match = re.exec(text))) {
              const start = match.index;
              const end = re.lastIndex;

              if (end > start) {
                matchedRanges.push({
                  start,
                  end,
                });
              }
              if (match.index === re.lastIndex) {
                re.lastIndex++;
              }
            }

            // マッチ部分がなければチャンクそのまま返す
            if (matchedRanges.length === 0) {
              return [{ text: text, className: "" }];
            }

            // 取得したマッチ位置でテキストを分割し、クラス名もついでに付与
            const { chunks, index } = matchedRanges.reduce(
              (
                prev: {
                  chunks: { text: string; className: string }[];
                  index: number;
                },
                currentRange,
                i
              ) => {
                // 現在のマッチ位置以前にヒットしなかったchunkがある場合、追加しておく
                if (currentRange.start > prev.index) {
                  prev.chunks.push({
                    text: text.slice(prev.index, currentRange.start),
                    className: "",
                  });
                }

                // マッチしたchunkを追加する
                prev.chunks.push({
                  text: text.slice(currentRange.start, currentRange.end),
                  className: props.textHighlighterOption.className[currentWord],
                });
                prev.index = currentRange.end;

                // 現在のマッチ以後にヒットしなかったchunkがあって、これが最後のマッチ位置の場合場、追加しておく
                if (
                  i === matchedRanges.length - 1 &&
                  currentRange.end < text.length
                ) {
                  prev.chunks.push({
                    text: text.slice(currentRange.end),
                    className: "",
                  });
                }
                return prev;
              },
              {
                chunks: [],
                index: 0,
              }
            );

            return chunks;
          })
          .flat();
      },
      [{ text: props.text, className: "" }]
    );

  return (
    <>
      {chunks.map((chunk, i) => {
        if (chunk.className === "") {
          return <span key={i}>{chunk.text}</span>;
        } else {
          if (chunk.className === "articleWord") {
            return (
              <a
                href="#1"
                key={i}
                onClick={(e) => {
                  const articleTerm = chunk.text.match(
                    /第[〇一二三四五六七八九十百]+条(?:の[〇一二三四五六七八九十百]+)*/
                  );
                  if (articleTerm) {
                    document
                      .getElementById(
                        `article${articleTerm[0]
                          .match(/[〇一二三四五六七八九十百]+/g)!
                          .map(kanji2number)
                          .join("_")}`
                      )
                      ?.scrollIntoView();
                  }
                }}
              >
                {chunk.text}
              </a>
            );
          } else {
            return (
              <span
                key={i}
                className={`word_inversion ${chunk.className}`}
                // style={{ color: "", backgroundColor: "" }} // TODO styleに色を直書きしたい
              >
                {chunk.text}
              </span>
            );
          }
        }
      })}
    </>
  );
};
