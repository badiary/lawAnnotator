import { kanji2number } from "@geolonia/japanese-numeral";
export type toolType = "free_text" | "pdf" | "web";
export type WordOption = {
  words: string[];
  color: string;
};

export class Sat {
  content_root: HTMLDivElement[] = []; // コンテンツを含む要素を指定

  word: SatWord | undefined; // ワード反転を扱うオブジェクト
  cv: SatCanvas | undefined; // スペクトルバーの描画を扱うオブジェクト

  initialize = (
    content_root: [HTMLDivElement, "visible" | "hidden"][],
    lightness: number,
    block_mode: boolean,
    auto_sieve_mode: boolean
  ) => {
    this.content_root = content_root.map((v) => {
      return v[0];
    });
    this.word = new SatWord(this, lightness, block_mode, auto_sieve_mode);
    this.cv = new SatCanvas(this, content_root);
  };
  /**
   * 対応するspan要素を削除。ただし、複数のクラスや属性があった場合は、指定したクラスや属性だけ削除してspanを残す
   * @param {span_element} el 削除したいspan
   * @param {class_name_arr} array 削除したいクラス名の配列
   * @param {attribute_name_arr} array 削除したい属性名の配列
   */
  removeSpan = (
    span: HTMLSpanElement,
    class_name_arr: string[],
    attribute_name_arr: string[]
  ): void => {
    class_name_arr.forEach((class_name): void => {
      span.classList.remove(class_name);
    });

    attribute_name_arr.forEach((attribute_name): void => {
      span.removeAttribute(attribute_name);
    });

    // if (span.classList.length === 0 && span.getAttribute("style") === null) {
    if (span.classList.length === 0) {
      const parent = span.parentElement!;
      span.replaceWith(...Array.from(span.childNodes));
      parent.normalize();
    }
  };

  /**
   * container要素におけるelement要素のxy座標を取得
   * @return { offset_top: x座標, offset_left: y座標 }
   */
  getOffset = (
    element: HTMLElement,
    container: HTMLElement
  ): { offset_top: number; offset_left: number } => {
    let offset_top = element.offsetTop;
    let offset_left = element.offsetLeft;
    let offset_parent = element.offsetParent as HTMLElement;
    while (offset_parent !== container && offset_parent !== null) {
      offset_top +=
        offset_parent.offsetTop +
        Number(
          window.getComputedStyle(offset_parent).borderWidth.slice(0, -2)
        ) *
          2;
      offset_left += offset_parent.offsetLeft;
      offset_parent = offset_parent.offsetParent as HTMLElement;
    }
    return { offset_top: offset_top, offset_left: offset_left };
  };

  /**
   * RGBをカラーコードに変換
   * https://decks.hatenadiary.org/entry/20100907/1283843862
   * @param col "rgb(R, G, B)"の形式の文字列
   * @return "#000000"形式のカラーコード
   */
  rgbTo16 = (col: string): string => {
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
  hslToRgb(h: number, s: number, l: number) {
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

    // return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    return (
      "#" +
      `0${Math.floor(r * 255).toString(16)}`.slice(-2) +
      `0${Math.floor(g * 255).toString(16)}`.slice(-2) +
      `0${Math.floor(b * 255).toString(16)}`.slice(-2)
    );
  }

  /**
   * 要素のセレクタを取得（参考：https://akabeko.me/blog/2015/06/get-element-selector/）
   * @param {object} el セレクタを取得したいエレメント
   * @returns {string} セレクタ
   */
  getSelectorFromElement = (el: any): string[] => {
    const names = [];

    while (el) {
      let name = el.nodeName.toLowerCase();
      if (el.id) {
        name += "#" + el.id;
        names.unshift(name);
        break;
      }

      const index = this.getSiblingElementsIndex(el, name);
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

  getSiblingElementsIndex = (el: Element, name: string): number => {
    let index = 1;
    let sib = el;

    while ((sib = sib.previousElementSibling!)) {
      if (sib.nodeName.toLowerCase() === name) {
        ++index;
      }
    }

    return index;
  };
}

class SatWord {
  sat: Sat;
  option: { [key: string]: WordOption } = {};
  textHighlighterOption: TextHighlighterOption = {
    words: [],
    className: {},
    query: "",
  };
  block_mode: boolean;
  block_mode_pattern = "[ァ-ヶーｱ-ﾝﾞﾟ一-龥0-9０-９a-zA-Zａ-ｚＡ-Ｚ.．]*";
  auto_sieve_mode: boolean;
  lightness: number;

  constructor(
    sat: Sat,
    lightness: number,
    block_mode: boolean,
    auto_sieve_mode: boolean
  ) {
    this.sat = sat;
    this.block_mode = block_mode;
    this.auto_sieve_mode = auto_sieve_mode;
    this.lightness = lightness;
  }

  setOption = (option: { [key: string]: WordOption }): void => {
    this.option = option;
    this.textHighlighterOption.words = [];
    this.textHighlighterOption.className = {};

    // 既存のスタイル削除
    const preexisting_style = window.document.head.querySelector(
      "style#SAT_word_inversion"
    );
    if (preexisting_style !== null) {
      preexisting_style.remove();
    }

    // スタイル設定
    const colorStyle = document.createElement("style");
    colorStyle.type = "text/css";
    colorStyle.id = "SAT_word_inversion";
    window.document.head.prepend(colorStyle);

    for (const color_id in this.option) {
      const color_code = this.option[color_id]!.color;

      colorStyle.sheet!.insertRule(
        `span.word_inversion_class${color_id} {background-color: ${color_code} !important; color: ${this.calcWordColor(
          color_code
        )} !important}`,
        0
      );
    }

    // react用のHighlighterOptionの設定
    Object.entries(this.option).forEach(([color_id, wordOption]) => {
      const className = `word_inversion_class${color_id}`;
      wordOption.words.forEach((word) => {
        if (/^\/.*\/$/.test(word)) {
          word = word.slice(1, -1); // 前後のスラッシュを削除
        } else {
          word = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // メタ文字をエスケープ
        }
        this.textHighlighterOption.words.push(word);
        this.textHighlighterOption.className[word] = className;
      });
    });
    // 条文リンク用の正規表現を追加
    const articleWord =
      "((?:第[〇一二三四五六七八九十百]+条(?:の[〇一二三四五六七八九十百]+)*(?:第[〇一二三四五六七八九十百]項)?(?:第[〇一二三四五六七八九十百]号)?)|(?:前[条項号](?:第[〇一二三四五六七八九十百][項号])*))";
    this.textHighlighterOption.words.unshift(articleWord);
    this.textHighlighterOption.className[articleWord] = "articleWord";
  };

  setColor = (color_id: number, color: string): void => {
    if (this.option[color_id]) this.option[color_id]!.color = color;
  };

  getWordColors = (length: number): string[] => {
    // https://gist.github.com/ibrechin/2489005 から拝借して一部改変

    const colors: string[] = [];
    // const l = this.sat.dark_mode ? 0.35 : 0.7;
    const l = this.sat.word!.lightness;

    for (let i = 0; i < length; i++) {
      // 適当に設定
      colors.push(this.sat.hslToRgb(i / length, 1.0, l));
    }

    return colors;
  };
  calcWordColor = (bg_color: string): string => {
    const brightness =
      parseInt(bg_color.substr(1, 2), 16) * 0.299 + // Red
      parseInt(bg_color.substr(3, 2), 16) * 0.587 + // Green
      parseInt(bg_color.substr(5, 2), 16) * 0.114; // Blue

    return brightness >= 140 ? "#111" : "#eed";
  };
}

type Rect = [string, number, number, number, number, number];
class SatCanvas {
  sat: Sat;
  element: HTMLCanvasElement[];
  word_rect: Rect[][] = [];
  constructor(
    sat: Sat,
    content_root_prop: [HTMLDivElement, "visible" | "hidden"][]
  ) {
    this.sat = sat;
    this.element = [];
    for (const [content_root, visibility] of content_root_prop) {
      this.word_rect.push([]);

      // CVオブジェクトを作って挿入する
      content_root.style.position = "relative";
      const cv = document.createElement("canvas");
      cv.width = Math.min(200, content_root.offsetWidth * 0.3);
      cv.height = content_root.offsetHeight;
      cv.style.height = `${cv.height}px`;
      cv.style.width = `${cv.width}px`;
      cv.style.visibility = visibility;

      cv.classList.add("spectrum_bar");

      content_root.appendChild(cv);
      this.element.push(cv);

      const hide_button = document.createElement("div");
      hide_button.classList.add("hide_spectrum_bar");
      content_root.appendChild(hide_button);

      // イベント設定
      const scroll_div = content_root.children[0]!;
      scroll_div.addEventListener("scroll", (e) => {
        sat.cv!.draw();
      });

      window.addEventListener("resize", () => {
        cv.width = Math.min(200, content_root.offsetWidth * 0.3);
        cv.height = content_root.offsetHeight;
        cv.style.height = `${cv.height}px`;
        cv.style.width = `${cv.width}px`;
        this.updateData();
        this.draw();
      });

      cv.onclick = (e: any) => {
        console.log("click cv");
        scroll_div.scrollTo(
          0,
          e.layerY * (scroll_div.scrollHeight / cv.height) - cv.height / 2
        );
      };
      cv.onmousedown = (e) => {
        cv.onmousemove = (e: any) => {
          scroll_div.scrollTo(
            0,
            e.layerY * (scroll_div.scrollHeight / cv.height) - cv.height / 2
          );
        };
        cv.onmouseup = () => {
          cv.onmousemove = null;
          cv.onmouseup = null;
        };
      };
      cv.onmouseover = () => {
        cv.onmousemove = null;
      };

      cv.addEventListener("wheel", (e) => {
        scroll_div.scrollBy(0, e.deltaY * 0.5);
      });

      hide_button.addEventListener("click", (e) => {
        if (cv.style.visibility === "hidden") {
          cv.style.visibility = "visible";
        } else {
          cv.style.visibility = "hidden";
        }
      });
    }
  }

  updateData = () => {
    // ワード反転のバーの色や位置を更新
    for (let i = 0; i < this.sat.content_root.length; i++) {
      this.word_rect[i] = [] as Rect[];
      const word_rect = this.word_rect[i];
      const content_root = this.sat.content_root[i];
      const cv = this.element[i];

      const color_dic: { [key: string]: number } = {};
      Array.from(
        new Set(
          Object.keys(this.sat.word!.option).map((color_id: string) => {
            return this.sat.word!.option[color_id]!.color;
          })
        )
      )
        .filter((color: string) => {
          return color !== "";
        })
        .forEach((color: string, i: number) => {
          color_dic[color] = i;
        });
      const color_num = Object.keys(color_dic).length;

      const span_parent_height = content_root.children[0]!.scrollHeight;

      Array.from(
        content_root.querySelectorAll<HTMLSpanElement>("span.word_inversion")
      ).forEach((span) => {
        const fill_color = this.sat.rgbTo16(
          window.getComputedStyle(span).backgroundColor
        );
        const rect_x = cv.width * (color_dic[fill_color]! / color_num);

        const offset = this.sat.getOffset(
          span,
          content_root.offsetParent as HTMLElement
        );
        const rect_y = cv.height * (offset.offset_top / span_parent_height);
        const rect_height = 3 * Math.max(span.offsetHeight / cv.height, 2);
        word_rect.push([
          fill_color,
          Math.round(rect_x) - 0.5,
          Math.round(rect_y - rect_height / 2.0) - 0.5,
          Math.round(cv.width / color_num) + 0,
          5,
          Math.round(rect_height / 2.0),
        ]);
      });
    }
  };

  draw = () => {
    for (let i = 0; i < this.sat.content_root.length; i++) {
      const word_rect = this.word_rect[i];
      const content_root = this.sat.content_root[i];
      const cv = this.element[i];

      const ctx = cv.getContext("2d")!;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, 200, window.innerHeight);

      word_rect.forEach((rect_arr): void => {
        ctx.fillStyle = rect_arr[0];
        ctx.fillRect(rect_arr[1], rect_arr[2], rect_arr[3], rect_arr[4]);
      });

      ctx.strokeStyle = "white";
      ctx.lineWidth = 5;
      const scroll_div = content_root.children[0]!;

      const scrollTop = scroll_div.scrollTop;
      const span_parent_height = scroll_div.scrollHeight;

      ctx.strokeRect(
        2.5,
        scrollTop * (cv.height / span_parent_height),
        cv.width - 2.5,
        content_root.offsetHeight * (cv.height / span_parent_height)
      );
    }
  };
}
