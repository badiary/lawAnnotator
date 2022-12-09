import React, { useRef, useEffect, useState } from "react";
import * as satModules from "./sat";

type MenuProps = {
  dispatch: React.Dispatch<DispatchAction>;
  sat: satModules.Sat;
  downloadLabel: () => Promise<void>;
  setTextHighlighterOption: React.Dispatch<React.SetStateAction<any>>;
  textHighlighterOption: TextHighlighterOption;
};
const Menu = (props: MenuProps) => {
  const wordQueryEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    wordQueryEl.current!.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        showSpinner("ワード反転中...", 10, () => {
          if (props.sat.word && props.sat.cv) {
            props.sat.word.setOption(getWordOption());

            props.setTextHighlighterOption({
              ...props.sat.word.textHighlighterOption,
              query: wordQueryEl.current!.innerText,
            });
            setColoredQuery();
            wordQueryEl.current!.blur();
          }
        });

        e.preventDefault();
      }
    });
  }, []);

  // useEffect(() => {
  //   const query_div = wordQueryEl.current!;
  //   query_div.innerText = props.textHighlighterOption.query;
  //   if (query_div.innerText) {
  //     showSpinner("ワード反転中...", 10, () => {
  //       if (props.sat.word && props.sat.cv) {
  //         props.sat.word.setOption(getWordOption());

  //         setColoredQuery();
  //         wordQueryEl.current!.blur();
  //       }
  //     });
  //   }
  // }, []);

  /**
   * #word_query内に入力されたクエリからワード反転のオプションを生成
   * @return {object} satオブジェクトに渡すワード反転のオプション
   */
  function getWordOption() {
    const query = wordQueryEl
      .current!.innerText.trim()
      .replace(/[\r\n]+/g, " ");
    if (query === "" || /^\s+$/.test(query)) {
      return {};
    }

    const word_arr: string[][] = query.split(/\s+/).map((word) => {
      const slash_match = word.match(/(^\/|[^\\]\/|\/$)/g);
      if (
        slash_match &&
        slash_match.length > 0 &&
        slash_match.length % 2 === 0
      ) {
        // クエリの最小単位を求める再帰関数（先頭から順に最小単位を切り取っていく）

        return getQueryUnitArr(word, []);
      } else {
        return word.split(/[+＋]/g);
      }
    });

    // 反転ワード情報を更新
    const colors = props.sat.word!.getWordColors(word_arr.length);

    const word_option: { [color_id: string]: satModules.WordOption } = {};
    word_arr.forEach((words: string[], i: number) => {
      words.forEach((word: string) => {
        if (!word_option[i]) {
          word_option[i] = { words: [], color: "" };
        }
        if (word.substr(0, 1) !== "/") {
          word_option[i]!.words.push(word.replace(/_/g, " "));
        } else {
          word_option[i]!.words.push(word);
        }

        word_option[i]!.color = colors[i]!;
      });
    });

    return word_option;
  }

  function getQueryUnitArr(word: string, acc: string[]): string[] {
    if (word.substr(0, 1) !== "/") {
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
      if (!mt) return acc; // 何かがおかしい
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

  /**
   * #word_query内に、キーワードを各反転色で反転させたHTMLをセット
   */
  function setColoredQuery() {
    const query_div = wordQueryEl.current!;
    query_div.innerHTML = "";

    Object.keys(props.sat.word!.option).forEach((color_id) => {
      props.sat.word!.option[color_id]!.words.forEach(
        (word: string, j: number) => {
          const span = document.createElement("span");
          span.innerText = word.replace(/ /g, "_");
          span.setAttribute("mode", "word_inversion");
          span.setAttribute("color_id", color_id);
          span.classList.add("query_unit");
          span.classList.add(`word_inversion_class${color_id}`);

          query_div.appendChild(span);
          if (j !== props.sat.word!.option[color_id]!.words.length - 1) {
            query_div.appendChild(document.createTextNode("+"));
          }
        }
      );
      query_div.appendChild(document.createTextNode(" "));
    });
  }

  return (
    <div id="Menu">
      <ul>
        <li>
          <input
            type="file"
            id="selfile"
            onChange={(e) => {
              if (!e.target.files) return;
              const file = e.target.files;

              //FileReaderの作成
              const reader = new FileReader();

              //テキスト形式で読み込む
              reader.readAsText(file[0]);

              //読込終了後の処理
              reader.onload = function (ev) {
                //テキストエリアに表示する
                props.dispatch({
                  type: "load",
                  json: reader.result as string,
                });
              };
            }}
          />
        </li>
        <li>
          <a
            href="#"
            onClick={async (e) => {
              props.downloadLabel();
            }}
          >
            <img
              src="data:image/png;base64,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"
              className="icon"
              title="ラベル保存"
              alt="ラベル保存"
            />
          </a>
        </li>

        <li className="blank"></li>
        <li>
          <div
            id="word_query"
            contentEditable="true"
            placeholder="反転ワードを入力...(Ctrl+Shift+F)"
            ref={wordQueryEl}
          ></div>
        </li>
      </ul>
    </div>
  );
};

export default Menu;

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