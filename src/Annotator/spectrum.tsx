import { useEffect, useRef, useState } from "react";
import hotkeys from "hotkeys-js";
import ContentEditable from "react-contenteditable";

export const getTextHighlighterOption = (
  query: string
): TextHighlighterOption => {
  function getQueryUnitArr(word: string, acc: string[]): string[] {
    if (word.substring(0, 1) !== "/") {
      // 先頭は正規表現でない -> 最先の+を見つけてそこで区切る
      const pos_plus = word.indexOf("+");
      if (pos_plus === -1) {
        acc.push(word);
        return acc;
      } else {
        acc.push(word.substring(0, pos_plus));
        return getQueryUnitArr(word.substring(pos_plus + 1), acc);
      }
    } else {
      // 先頭は正規表現 -> 最先の/（ただし\/は除外）を見つけてそこで区切る
      const mt = word.match(/[^\\]\/[dgimsuy]*/)!;
      if (!mt) {
        console.log("word re error", word);
        return acc; // 何かがおかしい
      }

      acc.push(word.substring(0, mt.index! + mt[0]!.length));

      if (word.length === mt.index! + mt[0]!.length) {
        return acc;
      } else {
        return getQueryUnitArr(
          word.substring(mt.index! + mt[0]!.length + 1),
          acc
        );
      }
    }
  }

  const trimedQuery = query.trim().replace(/[\r\n]+/g, " ");
  if (trimedQuery === "" || /^\s+$/.test(trimedQuery)) {
    return { items: [], query: query, coloredQuery: "", colorIndex: {} };
  }

  const groupedWords: string[][] = trimedQuery.split(/\s+/).map((word) => {
    const slash_match = word.match(/(^\/|[^\\]\/|\/$)/g);
    if (slash_match && slash_match.length > 0 && slash_match.length % 2 === 0) {
      // クエリの最小単位を求める再帰関数（先頭から順に最小単位を切り取っていく）
      return getQueryUnitArr(word, []);
    } else {
      return word.split(/[+＋]/g);
    }
  });

  const colors = getWordColors(groupedWords.length);
  const queryDiv = document.createElement("div");
  for (const [i, words] of groupedWords.entries()) {
    for (const [j, word] of words.entries()) {
      const span = document.createElement("span");
      span.innerText = word.replace(/ /g, "_");
      span.style.color = colors[i].color;
      span.style.backgroundColor = colors[i].backgroundColor;
      queryDiv.appendChild(span);
      if (j < words.length - 1) {
        queryDiv.appendChild(document.createTextNode("+"));
      }
    }
    queryDiv.appendChild(document.createTextNode(" "));
  }
  const coloredQuery = queryDiv.innerHTML;
  const colorIndex: { [color: string]: number } = Object.entries(colors).reduce(
    (prev: { [color: string]: number }, [i, cur]) => {
      prev[cur.backgroundColor] = Number(i);
      return prev;
    },
    {}
  );

  const option: TextHighlighterOption = groupedWords.reduce(
    (prev: TextHighlighterOption, cur, i) => {
      cur.forEach((word: string) => {
        const item = { word: word, style: colors[i] };
        if (item.word.substring(0, 1) !== "/") {
          item.word.replace(/_/g, " ");
        }
        if (/^\/.*\/$/.test(word)) {
          item.word = item.word.slice(1, -1); // 前後のスラッシュを削除
        } else {
          item.word = item.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // メタ文字をエスケープ
        }
        prev.items.push(item);
      });

      return prev;
    },
    {
      items: [],
      query: query,
      coloredQuery: coloredQuery,
      colorIndex: colorIndex,
    }
  );

  return option;
};

export type TextHighlighterOption = {
  items: {
    word: string;
    style?: React.CSSProperties;
    callback?: (text: string) => JSX.Element;
  }[];
  query: string;
  colorIndex: { [color: string]: number };
  coloredQuery: string;
};

type TextHighlighterProps = {
  text: string;
  textHighlighterOption: TextHighlighterOption;
};
type TextHighlighterChunk = {
  text: string;
  style?: React.CSSProperties;
  callback?: (text: string) => JSX.Element;
};
export const TextHighlighter = (props: TextHighlighterProps) => {
  if (!props.text) return <></>;
  const chunks: {
    text: string;
    style?: React.CSSProperties;
    callback?: (text: string) => JSX.Element;
  }[] = props.textHighlighterOption.items.reduce(
    // 反転ワード毎にループ
    (prev: TextHighlighterChunk[], currentItem) => {
      return prev
        .map(({ text, style, callback }) => {
          // chunk毎にループ
          // 既にヒット済みのchunkなら無視
          if (style || callback) {
            return [{ text, style, callback }];
          }

          // 正規表現のマッチ情報を元にtextの分割位置を取得
          let match: RegExpExecArray | null;
          let re: RegExp;
          try {
            re = new RegExp(currentItem.word, "gi");
          } catch (error) {
            console.log("RegExp error", currentItem.word);
            re = new RegExp("nomatchnomatchnomatch!!!", "gi");
          }

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
            return [{ text: text }];
          }

          // 取得したマッチ位置でテキストを分割し、クラス名もついでに付与
          const { chunks, index } = matchedRanges.reduce(
            (
              prev: {
                chunks: TextHighlighterChunk[];
                index: number;
              },
              currentRange,
              i
            ) => {
              // 現在のマッチ位置以前にヒットしなかったchunkがある場合、追加しておく
              if (currentRange.start > prev.index) {
                prev.chunks.push({
                  text: text.slice(prev.index, currentRange.start),
                });
              }

              // マッチしたchunkを追加する
              prev.chunks.push({
                text: text.slice(currentRange.start, currentRange.end),
                style: currentItem.style,
                callback: currentItem.callback,
              });
              prev.index = currentRange.end;

              // 現在のマッチ以後にヒットしなかったchunkがあって、これが最後のマッチ位置の場合場、追加しておく
              if (
                i === matchedRanges.length - 1 &&
                currentRange.end < text.length
              ) {
                prev.chunks.push({
                  text: text.slice(currentRange.end),
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
    [{ text: props.text }]
  );

  return (
    <>
      {chunks.map((chunk, i) => {
        if (chunk.callback) {
          return (
            <span key={i} text-highlight="true" style={chunk.style}>
              {chunk.callback(chunk.text)}
            </span>
          );
        }

        if (chunk.style) {
          return (
            <span text-highlight="true" key={i} style={chunk.style}>
              {chunk.text}
            </span>
          );
        } else {
          return <span key={i}>{chunk.text}</span>;
        }
      })}
    </>
  );
};

type Rect = {
  backgroundColor: string;
  x: number;
  y: number;
  w: number;
};
type SpectrumCanvasProps = {
  initialVisibility: "visible" | "hidden";
  parentContainer: HTMLElement | null;
  childContainer: HTMLElement | null;
  selectedLaw: string;
  textHighlighterOption: TextHighlighterOption;
};
export const SpectrumCanvas = (props: SpectrumCanvasProps) => {
  // TODO textContaierのpositionをrelativeにしたいが...ここで設定してしまうのは問題か？
  const [rects, setRects] = useState<Rect[]>([]);
  const [visibility, setVisibility] = useState(props.initialVisibility);
  const cv = useRef<HTMLCanvasElement>(null);
  const hideButtonEl = useRef<HTMLDivElement>(null);

  const isLoaded = (): boolean => {
    if (
      props.parentContainer === undefined ||
      props.childContainer === undefined ||
      cv.current === null ||
      hideButtonEl.current === null
    ) {
      return false;
    } else {
      return true;
    }
  };

  useEffect(() => {
    if (!isLoaded()) return; // TODO!currentがnullの場合スキップされてしまうのはいいのか？

    cv.current!.width = Math.min(200, props.parentContainer!.offsetWidth * 0.3);
    cv.current!.height = props.parentContainer!.offsetHeight;
    cv.current!.style.height = `${cv.current!.height}px`;
    cv.current!.style.width = `${cv.current!.width}px`;

    // イベント設定
    // TODO! リサイズ時にスペクトルバーの再描画が上手くいかない
    const resizeHandler = () => {
      cv.current!.width = Math.min(
        200,
        props.parentContainer!.offsetWidth * 0.3
      );
      cv.current!.height = props.parentContainer!.offsetHeight;
      cv.current!.style.height = `${cv.current!.height}px`;
      cv.current!.style.width = `${cv.current!.width}px`;
      updateRects();
    };
    window.addEventListener("resize", resizeHandler);
    cv.current!.onclick = (e: any) => {
      props.childContainer!.scrollTo(
        0,
        e.layerY * (props.childContainer!.scrollHeight / cv.current!.height) -
          cv.current!.height / 2
      );
    };
    cv.current!.onmousedown = (e) => {
      cv.current!.onmousemove = (e: any) => {
        props.childContainer!.scrollTo(
          0,
          e.layerY * (props.childContainer!.scrollHeight / cv.current!.height) -
            cv.current!.height / 2
        );
      };
      cv.current!.onmouseup = () => {
        cv.current!.onmousemove = null;
        cv.current!.onmouseup = null;
      };
    };
    cv.current!.onmouseover = () => {
      cv.current!.onmousemove = null;
    };

    cv.current!.addEventListener("wheel", (e) => {
      props.childContainer!.scrollBy(0, e.deltaY * 0.5);
    });

    hideButtonEl.current!.addEventListener("click", (e) => {
      if (cv.current!.style.visibility === "hidden") {
        setVisibility("visible");
      } else {
        setVisibility("hidden");
      }
    });

    draw();
    return () => window.removeEventListener("resize", resizeHandler);
  }, [props.parentContainer, props.childContainer, props.selectedLaw]);

  useEffect(() => {
    updateRects();
  }, [
    props.textHighlighterOption,
    props.parentContainer,
    props.childContainer,
    props.selectedLaw,
  ]);

  useEffect(() => {
    draw();

    props.childContainer!.addEventListener("scroll", (e) => {
      draw();
    });
  }, [rects]);

  const draw = () => {
    if (!isLoaded()) return;

    const ctx = cv.current!.getContext("2d")!;
    ctx.clearRect(0, 0, cv.current!.width, cv.current!.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 200, window.innerHeight);

    rects.forEach((rect): void => {
      ctx.fillStyle = rect.backgroundColor;
      ctx.fillRect(rect.x, rect.y, rect.w, 5.0);
    });

    ctx.strokeStyle = "white";
    ctx.lineWidth = 5;

    const scrollTop = props.childContainer!.scrollTop;
    const span_parent_height = props.childContainer!.scrollHeight;

    ctx.strokeRect(
      2.5,
      scrollTop * (cv.current!.height / span_parent_height),
      cv.current!.width - 2.5,
      props.parentContainer!.offsetHeight *
        (cv.current!.height / span_parent_height)
    );
  };

  const updateRects = () => {
    // ワード反転のバーの色や位置を更新
    if (!isLoaded()) return;

    const newRects: Rect[] = [];

    const span_parent_height = props.parentContainer!.children[0]!.scrollHeight;
    const colorNum = Object.keys(props.textHighlighterOption.colorIndex).length;

    Array.from(
      props.parentContainer!.querySelectorAll<HTMLSpanElement>(
        "span[text-highlight]"
      )
    ).forEach((span) => {
      const backgroundColor = rgbTo16(
        window.getComputedStyle(span).backgroundColor
      );
      const rect_x =
        cv.current!.width *
        (props.textHighlighterOption.colorIndex[backgroundColor]! / colorNum);

      const offset = getOffset(
        span,
        props.parentContainer!.offsetParent as HTMLElement
      );
      const rect_y =
        cv.current!.height * (offset.offset_top / span_parent_height);
      const rect_height = 5.0;
      newRects.push({
        backgroundColor: backgroundColor,
        x: Math.round(rect_x) - 0.5,
        y: Math.round(rect_y - rect_height / 2.0) - 0.5,
        w: Math.round(cv.current!.width / colorNum) + 0,
      });
    });
    setRects(newRects);
  };

  if (props.parentContainer === undefined) return <></>;

  return (
    <>
      <canvas
        ref={cv}
        style={{
          visibility: visibility,
          backgroundColor: "black",
          position: "absolute",
          top: "0%",
          right: "0%",
          opacity: "0.5",
          zIndex: "9999997",
          width: "0px",
          cursor: "pointer",
        }}
      ></canvas>
      <div
        ref={hideButtonEl}
        // className="hide_spectrum_bar"
        style={{
          backgroundColor: "red",
          position: "absolute",
          top: "0%",
          right: "0%",
          width: "30px",
          height: "30px",
          opacity: "0.5",
          zIndex: "9999998",
          cursor: "pointer",
        }}
      ></div>
    </>
  );
};

/**
 * RGBをカラーコードに変換
 * https://decks.hatenadiary.org/entry/20100907/1283843862
 * @param col "rgb(R, G, B)"の形式の文字列
 * @return "#000000"形式のカラーコード
 */
const rgbTo16 = (col: string): string => {
  return (
    "#" +
    col
      .match(/\d+/g)
      ?.map((a: string) => {
        return ("0" + parseInt(a).toString(16)).slice(-2);
      })
      .join("")
  );
};

/**
 * container要素におけるelement要素のxy座標を取得
 * @return { offset_top: x座標, offset_left: y座標 }
 */
const getOffset = (
  element: HTMLElement,
  container: HTMLElement
): { offset_top: number; offset_left: number } => {
  let offset_top = element.offsetTop;
  let offset_left = element.offsetLeft;
  let offset_parent = element.offsetParent as HTMLElement;
  while (offset_parent !== container && offset_parent !== null) {
    offset_top +=
      offset_parent.offsetTop +
      Number(window.getComputedStyle(offset_parent).borderWidth.slice(0, -2)) *
        2;
    offset_left += offset_parent.offsetLeft;
    offset_parent = offset_parent.offsetParent as HTMLElement;
  }
  return { offset_top: offset_top, offset_left: offset_left };
};
/**
 * 要素のセレクタを取得（参考：https://akabeko.me/blog/2015/06/get-element-selector/）
 * @param {object} el セレクタを取得したいエレメント
 * @returns {string} セレクタ
 */
const getSelectorFromElement = (el: any): string[] => {
  const names = [];

  while (el) {
    let name = el.nodeName.toLowerCase();
    if (el.id) {
      name += "#" + el.id;
      names.unshift(name);
      break;
    }

    const index = getSiblingElementsIndex(el, name);
    name += ":nth-of-type(" + index + ")";

    names.unshift(name);
    el = el.parentNode;
  }

  return names;
};

/**
 * 親要素に対して何番目の子要素かを取得
 * https://github.com/akabekobeko/examples-web-app/tree/get-element-selector/get-element-selector
 * @param el 調べたい子要素
 * @return index 何番目かを表す数値
 */

const getSiblingElementsIndex = (el: Element, name: string): number => {
  let index = 1;
  let sib = el;

  while ((sib = sib.previousElementSibling!)) {
    if (sib.nodeName.toLowerCase() === name) {
      ++index;
    }
  }

  return index;
};

/**
 * https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
const hslToRgb = (h: number, s: number, l: number) => {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = function hue2rgb(p: number, q: number, t: number) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return (
    "#" +
    `0${Math.floor(r * 255).toString(16)}`.slice(-2) +
    `0${Math.floor(g * 255).toString(16)}`.slice(-2) +
    `0${Math.floor(b * 255).toString(16)}`.slice(-2)
  );
};

const getWordColors = (
  length: number,
  lightness = 0.5
): { color: string; backgroundColor: string }[] => {
  // https://gist.github.com/ibrechin/2489005 から拝借して一部改変

  const calcWordColor = (backgroundColor: string): string => {
    const brightness =
      parseInt(backgroundColor.substring(1, 2), 16) * 0.299 + // Red
      parseInt(backgroundColor.substring(3, 5), 16) * 0.587 + // Green
      parseInt(backgroundColor.substring(5, 7), 16) * 0.114; // Blue
    return brightness >= 140 ? "#111111" : "#eeeedd";
  };

  const colors: { color: string; backgroundColor: string }[] = [];

  for (let i = 0; i < length; i++) {
    const backgroundColor = hslToRgb(i / length, 1.0, lightness);
    const color = calcWordColor(backgroundColor);
    colors.push({ color, backgroundColor });
  }

  return colors;
};

type SpectrumQueryInputProps = {
  setTextHighlighterOption: React.Dispatch<React.SetStateAction<any>>;
  textHighlighterOption: TextHighlighterOption;
};
export const SpectrumQueryInput = (props: SpectrumQueryInputProps) => {
  function showSpinner(message: string, msec: number, exec_func: any) {
    document.getElementById("loading_message")!.innerHTML = message;
    const spinner = document.getElementById("spinner")!;
    spinner.classList.add("visible");
    new Promise((resolve, reject) => {
      setTimeout(() => {
        exec_func();
        resolve(null);
      }, msec);
    }).then(() => {
      spinner.classList.remove("visible");
    });
  }

  const queryInputEl = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(props.textHighlighterOption.coloredQuery);

  useEffect(() => {
    setHtml(props.textHighlighterOption.coloredQuery);
  }, [props.textHighlighterOption]);

  useEffect(() => {
    queryInputEl.current!.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        showSpinner("ワード反転中...", 10, () => {
          const option = getTextHighlighterOption(
            queryInputEl.current!.innerText
          );
          console.log(option.items);
          props.setTextHighlighterOption(option);
        });
        e.preventDefault();
        queryInputEl.current!.blur();
      }
    });

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
      queryInputEl.current!.click();
      setCaretToEnd(queryInputEl.current!);
    });
  }, []);

  const handleChange = (e: any) => {
    setHtml(e.target.value);
  };

  return (
    <ContentEditable
      id="word_query"
      placeholder="反転ワードを入力...(Ctrl+Shift+F)"
      innerRef={queryInputEl}
      html={html}
      disabled={false}
      onChange={handleChange}
    />
  );
};
