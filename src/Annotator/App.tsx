import React, { useState, useEffect, createContext } from "react";
import Annotator from "./Annotator";
import { kanji2number } from "@geolonia/japanese-numeral";
import * as satModules from "./sat";

export const LawContext = createContext({});

const lawProps: {
  [key: string]: {
    name: string;
    path: {
      taiyaku: string;
      chikujo: string;
      label: string;
    };
  };
} = {
  jpPatent: {
    name: "特許法",
    path: {
      taiyaku: "../../extraResources/JP/taiyaku_patent.html",
      chikujo: "../../extraResources/JP/chikujo_patent.txt",
      label: "../../label/jpPatent/jpPatent.json",
    },
  },
  jpUtil: {
    name: "実用新案法",
    path: {
      taiyaku: "../../extraResources/JP/taiyaku_util.html",
      chikujo: "../../extraResources/JP/chikujo_util.txt",
      label: "../../label/jpUtil/jpUtil.json",
    },
  },
};

function App() {
  const [law, setLaw] = useState({});
  const [selectedLaw, setSelectedLaw] = useState("jpPatent");
  const [label, setLabel] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function readData() {
      const result = await fetch("./resource/chikujo_patent.txt");
      const data_chikujo = await result.text();
      console.log(data_chikujo);

      // const data_chikujo = await window.electronAPI.openFile(
      //   lawProps[selectedLaw].path.chikujo,
      //   { encoding: "utf-8" }
      // );

      // if (data_chikujo.error) {
      //   console.log(data_chikujo.error);
      //   alert("逐条解説データの読み込み失敗");
      //   return;
      // }

      // 対訳HTMLをLawXMLの形式に落とし込む
      const result2 = await fetch("./resource/taiyaku_patent.html");
      const data_taiyaku = await result2.text();
      // console.log(data_taiyaku);
      // const data_taiyaku = await window.electronAPI.openFile(
      //   lawProps[selectedLaw].path.taiyaku,
      //   { encoding: "utf-8" }
      // );
      // if (data_taiyaku.error) {
      //   console.log(data_taiyaku.error);
      //   alert("対訳データの読み込み失敗");
      //   return;
      // }

      const lawHTML = document.createElement("div");
      lawHTML.innerHTML = data_taiyaku;

      const taiyakuLaw: LawXML = {
        $: {
          Name: lawProps[selectedLaw].name,
        },
        LawBody: {
          LawTitle: {
            _: `${
              (lawHTML.querySelector("span.LawTitle_text")! as HTMLElement)
                .innerText
            }`,
          },
          MainProvision: {
            Chapter: Array.from(
              lawHTML
                .querySelector("div.MainProvision")!
                .querySelectorAll("div.Chapter")
            ).map((chapterEl, i) => {
              return cleanChapter(chapterEl as HTMLElement, i);
            }),
          },
        },
        Article: {},
        Chikujo: {},
        sat: new satModules.Sat(),
      };

      const law: LawXML = taiyakuLaw;
      // ここでarticle一覧を作ってしまう
      law.Article = law.LawBody.MainProvision.Chapter.map(
        (chapter: ChapterXML) => {
          if (chapter.Section) {
            return chapter.Section.map((section: SectionXML) => {
              return section.Article;
            });
          } else if (chapter.Article) {
            return [chapter.Article];
          } else {
            return [];
          }
        }
      )
        .flat(2)
        .reduce(
          (prev: { [articleNum: string]: ArticleXML }, cur: ArticleXML) => {
            prev[cur.$.Num] = cur;
            return prev;
          },
          {}
        );

      // 逐条解説のパース
      const articleTitles = data_chikujo.match(
        /^第[〇一二三四五六七八九十百]+条(?:の[〇一二三四五六七八九十百]+)*/gm
      )!;
      const contents = data_chikujo
        .split(
          /^第[〇一二三四五六七八九十百]+条(?:の[〇一二三四五六七八九十百]+)*[\r\n]*/gm
        )!
        .slice(1);
      const chikujo_arr: {
        [articleNum: string]: string;
      } = articleTitles.reduce(
        (
          prev: {
            [articleNum: string]: string;
          },
          cur: string,
          idx: number
        ) => {
          const articleNum = cur
            .match(/[〇一二三四五六七八九十百]+/g)!
            .map(kanji2number)
            .join("-");
          prev[articleNum] = contents[idx].trim();
          return prev;
        },
        {}
      );

      law.Chikujo = chikujo_arr;
      console.log(law);

      if (Object.keys(label).length) {
        // @ts-ignore
        law.initialState = label;
      }

      setLoading(false);
      setLaw(law);
      console.log({ law });
    }
    setLoading(true);
    readData();
    console.log({ selectedLaw });
  }, [selectedLaw, label]);

  return (
    <>
      {loading && <p>loading...</p>}
      {!loading && (
        <LawContext.Provider value={law}>
          <div id="spinner">
            <div id="spinner_inside">
              <p id="loading_message"></p>
              <div className="lds-ellipsis">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
              </div>
            </div>
          </div>

          <Annotator
            lawProps={lawProps}
            selectedLaw={selectedLaw}
            setSelectedLaw={setSelectedLaw}
            setLabel={setLabel}
          />
        </LawContext.Provider>
      )}
    </>
  );
}

export default App;

// 以下、対訳HTMLのパース用関数
const cleanChapter = (chapterEl: HTMLElement, index: number): ChapterXML => {
  const chapter: any = {};
  chapter.$ = { num: index + 1 };
  chapter.ChapterTitle = (
    chapterEl.querySelector("div.ChapterTitle") as HTMLElement
  ).innerText;
  chapter.ChapterTitleEn = (
    chapterEl.querySelectorAll("div.ChapterTitle")[1] as HTMLElement
  ).innerText;
  const sectionEls = chapterEl.querySelectorAll("div.Section");
  if (sectionEls.length > 0) {
    chapter.Section = Array.from(sectionEls).map((sectionEl, i) => {
      return cleanSection(sectionEl as HTMLElement, i);
    });
  } else {
    chapter.Article = Array.from(chapterEl.querySelectorAll("div.Article")).map(
      (articleEl) => {
        return cleanArticle(articleEl as HTMLElement);
      }
    );
  }
  return chapter;
};

const cleanSection = (sectionEl: HTMLElement, index: number): SectionXML => {
  const section: SectionXML = {
    $: { Num: (index + 1).toString() },
    SectionTitle: (sectionEl.querySelector("div.SectionTitle") as HTMLElement)
      .innerText,
    SectionTitleEn: (
      sectionEl.querySelectorAll("div.SectionTitle")[1] as HTMLElement
    ).innerText,
    Article: Array.from(sectionEl.querySelectorAll("div.Article")).map(
      (articleEl) => {
        return cleanArticle(articleEl as HTMLElement);
      }
    ),
  };
  return section;
};

const cleanArticle = (articleEl: HTMLElement): ArticleXML => {
  const articleNum = (
    articleEl.querySelectorAll("span.ArticleTitle")[1] as HTMLElement
  ).innerText
    .replace(/ (through|and) /, "-")
    .split(" ")[1];
  const article: any = {
    $: {
      Num: articleNum,
    },
    ArticleCaption: (
      articleEl.querySelector("div.ArticleCaption") as HTMLElement
    )?.innerText,
    ArticleCaptionEn: (
      articleEl.querySelectorAll("div.ArticleCaption")[1] as HTMLElement
    )?.innerText,
    ArticleTitle: (articleEl.querySelector("span.ArticleTitle") as HTMLElement)
      .innerText,
    ArticleTitleEn: (
      articleEl.querySelectorAll("span.ArticleTitle")[1] as HTMLElement
    ).innerText,
    Paragraph: Array.from(articleEl.querySelectorAll("div.Paragraph")).map(
      (paragraphEl, i) => {
        return cleanParagraph(paragraphEl as HTMLElement, i, `a${articleNum}`);
      }
    ),
  };
  return article;
};

const cleanParagraph = (
  paragraphEl: HTMLElement,
  index: number,
  previousNum: string
): ParagraphXML => {
  const temp = paragraphEl.querySelector("span.ParagraphNum") as HTMLElement;
  const paragraphNum = temp
    ? temp.innerText
        .replace(/[０-９]/g, function (s) {
          return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
        })
        .replace(/[()]/g, "")
    : "1";
  const paragraph: ParagraphXML = {
    $: {
      Num: (index + 1).toString(),
    },
    ParagraphNum: paragraphNum,
    ParagraphSentence: cleanParagraphSentence(
      paragraphEl.querySelector("div.ParagraphSentence") as HTMLElement,
      `${previousNum}-p${paragraphNum}`
    ),
    ParagraphSentenceEn: cleanParagraphSentence(
      paragraphEl.querySelectorAll("div.ParagraphSentence")[1] as HTMLElement,
      `${previousNum}-p${paragraphNum}`
    ),

    Item: Array.from(paragraphEl.querySelectorAll("div.Item")).map(
      (itemEl, i) => {
        return cleanItem(
          itemEl as HTMLElement,
          i,
          `${previousNum}-p${paragraphNum}`
        );
      }
    ),
  };
  return paragraph;
};

const cleanParagraphSentence = (
  paragraphSentenceEl: HTMLElement,
  previousNum: string
): ParagraphSentenceXML => {
  let sentenceNum = (
    paragraphSentenceEl.querySelector("span.ParagraphNum") as HTMLElement
  )?.innerText;
  sentenceNum = sentenceNum
    ? sentenceNum.replace(/[０-９]/g, function (s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
      })
    : "1";
  const paragraphSentence: ParagraphSentenceXML = {
    $: {
      Num: sentenceNum,
    },
    Sentence: {
      $: {
        Num: `${previousNum}-s${sentenceNum}`,
      },
      _: paragraphSentenceEl.innerHTML
        .trim()
        .replace(/^.*span>/, "")
        .replace(/<[^>]+>/g, "")
        .replace(/[\s\n]+/g, " "),
    },
  };
  return paragraphSentence;
};

const cleanItem = (
  itemEl: HTMLElement,
  index: number,
  previousNum: string
): ItemXML => {
  const itemNum = (index + 1).toString();
  const item: ItemXML = {
    $: {
      Num: itemNum,
    },
    ItemTitle: (itemEl.querySelector("span.ItemTitle") as HTMLElement)
      .innerText,
    ItemTitleEn: (itemEl.querySelectorAll("span.ItemTitle")[1] as HTMLElement)
      .innerText,
    ItemSentence: cleanItemSentence(
      itemEl.querySelector("div.ItemSentence") as HTMLElement,
      `${previousNum}-i${itemNum}`
    ),
    ItemSentenceEn: cleanItemSentence(
      itemEl.querySelectorAll("div.ItemSentence")[1] as HTMLElement,
      `${previousNum}-i${itemNum}`
    ),
  };
  return item;
};

const cleanItemSentence = (
  itemSentenceEl: HTMLElement,
  previousNum: string
): ItemSentenceXML => {
  // const itemSentenceNum = (
  //   itemSentenceEl.querySelector("span.ItemTitle") as HTMLElement
  // ).innerText;
  const itemSentence: ItemSentenceXML = {
    Sentence: {
      $: {
        Num: `${previousNum}-s1`,
      },
      _: itemSentenceEl.innerHTML
        .trim()
        .replace(/^.*span>/, "")
        .replace(/<[^>]+>/g, "")
        .replace(/[\s\n]+/g, " "),
    },
  };
  return itemSentence;
};
