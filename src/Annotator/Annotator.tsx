import React, {
  useContext,
  useReducer,
  useRef,
  useEffect,
  useState,
} from "react";
import { GlobalDataContext } from "./App";
import JPTextAnnotator from "./JPTextAnnotator";
import { Container, Row, Col } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import JPFullText from "./JPFullText";
import EPFullText from "./EPFullText";
import Menu from "./Menu";
import hotkeys from "hotkeys-js";
import { kanji2number } from "@geolonia/japanese-numeral";

type AnnotatorProps = {
  lawProps: {
    [key: string]: {
      name: string;
      path: {
        taiyaku?: string;
        chikujo?: string;
        ja?: string;
        en?: string;
      };
    };
  };
  selectedLaw: string;
  setSelectedLaw: React.Dispatch<React.SetStateAction<string>>;
  setInitialStates: React.Dispatch<
    React.SetStateAction<{ [lawName: string]: InitialState }>
  >;
};
function Annotator(props: AnnotatorProps) {
  console.log("rendering Annotator", props.selectedLaw);
  const globalData = useContext<GlobalData>(GlobalDataContext);
  let initialtextHighlighterOption: TextHighlighterOption = {
    words: [],
    className: {},
    query: "",
  };
  if (globalData.initialStates[props.selectedLaw]?.textHighlighterOption) {
    initialtextHighlighterOption =
      globalData.initialStates[props.selectedLaw]!.textHighlighterOption;
  }
  const [textHighlighterOption, setTextHighlighterOption] = useState(
    initialtextHighlighterOption
  );

  // 初期のラベルデータをセット
  let initialAnnotatorState: AnnotatorState;
  let initialRelation: { [articleNum: string]: Set<string> } = {};
  if (globalData.initialStates[props.selectedLaw]) {
    // relationの中のarrayをsetに変換
    initialRelation = Object.entries(
      globalData.initialStates[props.selectedLaw].relation
    ).reduce(
      (
        prev: { [articleNum: string]: Set<string> },
        [articleNum, relatedArticleNums]
      ) => {
        prev[articleNum] = new Set<string>(relatedArticleNums);
        return prev;
      },
      {}
    );

    const { relation, ...otherStates } =
      globalData.initialStates[props.selectedLaw];
    initialAnnotatorState = { relation: initialRelation, ...otherStates };
  } else {
    if (props.selectedLaw === "jpPatent" || props.selectedLaw === "jpUtil") {
      initialRelation = Object.keys(
        globalData.jpLaw[props.selectedLaw].Article
      ).reduce((prev: { [articleNum: string]: Set<string> }, cur: string) => {
        prev[cur] = new Set<string>();
        return prev;
      }, {});
    } else {
      // TODO! epcの場合のinitialRelationの作成
    }

    initialAnnotatorState = {
      relation: initialRelation,
      textLabel: {},
    };
  }

  const [annotatorState, dispatch] = useReducer(reducer, initialAnnotatorState);

  function reducer(
    annotatorState: AnnotatorState,
    action: DispatchAction
  ): AnnotatorState {
    console.log("action", { action, annotatorState });
    // 再レンダリングを意識してオブジェクトを作り変えるのを忘れない！
    const newAnnotatorState: AnnotatorState = { ...annotatorState };

    switch (action.type) {
      case "update":
        return { ...action.annotatorState! };
      case "target":
        if (annotatorState.targetedArticleNum === action.articleNum) {
          return annotatorState;
        }
        newAnnotatorState.targetedArticleNum = action.articleNum;
        newAnnotatorState.pairedArticleNum = undefined;
        return newAnnotatorState;

      case "addArticle":
      case "deleteArticle": {
        if (!annotatorState.targetedArticleNum) {
          alert("Select an article to target first.");
          return annotatorState;
        }
        if (annotatorState.targetedArticleNum === action.articleNum) {
          alert("Cannot add / delete the targeted article itself.");
          return annotatorState;
        }

        if (action.type === "addArticle") {
          newAnnotatorState.relation[annotatorState.targetedArticleNum].add(
            action.articleNum
          );
          newAnnotatorState.relation[action.articleNum].add(
            annotatorState.targetedArticleNum
          );
          newAnnotatorState.pairedArticleNum = action.articleNum;
        } else if (action.type === "deleteArticle") {
          newAnnotatorState.relation[annotatorState.targetedArticleNum].delete(
            action.articleNum
          );
          newAnnotatorState.relation[action.articleNum].delete(
            annotatorState.targetedArticleNum
          );
          const articleNumPair = [
            action.articleNum,
            annotatorState.targetedArticleNum,
          ]
            .sort()
            .join(",");
          newAnnotatorState.textLabel[articleNumPair] = {};
          if (action.articleNum === annotatorState.pairedArticleNum) {
            newAnnotatorState.pairedArticleNum = undefined;
          }
        }

        // 再レンダリング処理
        newAnnotatorState.relation = { ...newAnnotatorState.relation };

        return newAnnotatorState;
      }

      case "text": {
        if (!action.text) {
          return annotatorState;
        }
        if (!annotatorState.targetedArticleNum) {
          alert("Select targeted article.");
          return annotatorState;
        }

        console.log(action.text);

        let articleNumPair: string;
        if (action.articleNum !== annotatorState.targetedArticleNum) {
          // labeled articleのアノテーションの場合

          // pairedArticleNumが違っていたら更新して終わり
          if (action.articleNum !== newAnnotatorState.pairedArticleNum) {
            newAnnotatorState.pairedArticleNum = action.articleNum;
            return newAnnotatorState;
          }

          articleNumPair = [
            action.articleNum,
            annotatorState.targetedArticleNum,
          ]
            .sort()
            .join(",");
        } else if (
          annotatorState.pairedArticleNum &&
          annotatorState.pairedArticleNum !== annotatorState.targetedArticleNum
        ) {
          // targeted articleのアノテーションでちゃんとペアが設定されている場合
          articleNumPair = [
            annotatorState.pairedArticleNum,
            annotatorState.targetedArticleNum,
          ]
            .sort()
            .join(",");
        } else {
          alert("Select paired article.");
          return annotatorState;
        }

        if (!newAnnotatorState.textLabel[articleNumPair]) {
          newAnnotatorState.textLabel[articleNumPair] = {};
        }
        newAnnotatorState.textLabel[articleNumPair][action.text.sentenceID] =
          action.text.textLabels;

        // 再レンダリング処理
        newAnnotatorState.textLabel = { ...newAnnotatorState.textLabel };
        newAnnotatorState.textLabel[articleNumPair] = {
          ...newAnnotatorState.textLabel[articleNumPair],
        };
        return newAnnotatorState;
      }
      default:
        return annotatorState;
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
    globalData.sat!.initialize(
      [
        [fulltextEl.current!, "visible"],
        // [targetedArticleEl.current!, "hidden"],
        // [labeledArticleEl.current!, "hidden"],
      ],
      0.5,
      true,
      false
    );
    globalData.sat!.cv!.draw();

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
  }, []);

  const saveLabel = async () => {
    const data: any = { ...annotatorState };
    data.relation = Object.entries(annotatorState.relation).reduce(
      (
        prev: { [articleNum: string]: string[] },
        [articleNum, relatedArticleSet]
      ) => {
        prev[articleNum] = Array.from(relatedArticleSet);
        return prev;
      },
      {}
    );
    data.textHighlighterOption = textHighlighterOption;

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
    if (globalData.sat!.cv) {
      globalData.sat!.cv.updateData();
      globalData.sat!.cv.draw();
    } else {
      alert("no sat cv");
    }
  }, [textHighlighterOption]);

  console.log({ annotatorState });
  return (
    <Container id="main">
      <Row id="title">
        <Col>
          <h4>
            <ButtonGroup aria-label="Basic example">
              {Object.entries(props.lawProps).map(([key, val]) => {
                if (key === props.selectedLaw) {
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
                        props.setSelectedLaw(clickedKey);
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
            setInitialStates={props.setInitialStates}
            saveLabel={saveLabel}
            setTextHighlighterOption={setTextHighlighterOption}
            textHighlighterOption={textHighlighterOption}
          ></Menu>
        </Col>
      </Row>
      <Row id="lawViewer">
        <Container>
          <Row className="oneRow">
            <Col className="col-6" ref={fulltextEl}>
              {(props.selectedLaw === "jpPatent" ||
                props.selectedLaw === "jpUtil") && (
                <JPFullText
                  selectedLaw={props.selectedLaw}
                  targetedArticleNum={annotatorState.targetedArticleNum}
                  relation={
                    annotatorState.targetedArticleNum
                      ? annotatorState.relation[
                          annotatorState.targetedArticleNum
                        ]
                      : new Set<string>()
                  }
                  dispatch={dispatch}
                  textHighlighterOption={textHighlighterOption}
                />
              )}
              {props.selectedLaw === "epc" && (
                <EPFullText
                  targetedArticleNum={annotatorState.targetedArticleNum}
                  relation={
                    annotatorState.targetedArticleNum
                      ? annotatorState.relation[
                          annotatorState.targetedArticleNum
                        ]
                      : new Set<string>()
                  }
                  dispatch={dispatch}
                  textHighlighterOption={textHighlighterOption}
                />
              )}
            </Col>
            <Col>
              {(props.selectedLaw === "jpPatent" ||
                props.selectedLaw === "jpUtil") && (
                <JPTextAnnotator
                  selectedLaw={props.selectedLaw}
                  targetedArticleNum={annotatorState.targetedArticleNum}
                  pairedArticleNum={annotatorState.pairedArticleNum}
                  relation={annotatorState.relation}
                  textLabel={annotatorState.textLabel}
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
