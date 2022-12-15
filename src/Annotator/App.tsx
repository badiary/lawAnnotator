import React, { useState, useEffect, createContext } from "react";
import Annotator from "./Annotator";
import { kanji2number } from "@geolonia/japanese-numeral";

// @ts-ignore
export const LawContext = createContext<Law>({});

const lawInfo: {
  [key: string]: {
    name: string;
    path: {
      taiyaku?: string;
      chikujo?: string;
      ja?: string;
      en?: string;
    };
  };
} = {
  jpPatent: {
    name: "特許法",
    path: {
      taiyaku: "./resource/JP/taiyaku_patent.html",
      chikujo: "./resource/JP/chikujo_patent.txt",
    },
  },
  jpUtil: {
    name: "実用新案法",
    path: {
      taiyaku: "./resource/JP/taiyaku_util.html",
      chikujo: "./resource/JP/chikujo_util.txt",
    },
  },
  epc: {
    name: "欧州特許条約",
    path: {
      ja: "./resource/EP/epc_ja.html",
      en: "./resource/EP/epc_html/whole.html",
    },
  },
};

function App() {
  const [law, setLaw] = useState<Law>({ info: lawInfo, content: {} });
  const [loadingLaw, setLoadingLaw] = useState(true);

  useEffect(() => {
    async function getLaw() {
      for (const lawName of ["jpPatent", "jpUtil"]) {
        newLaw.content[lawName] = await getJPLaw(lawName);
      }
      newLaw.content["epc"] = await getEPLaw();
      setLaw(newLaw);
      setLoadingLaw(false);
    }
    const newLaw = { ...law };
    setLoadingLaw(true);
    getLaw();
  }, []);

  return (
    <>
      {loadingLaw && <p>loading...</p>}
      {!loadingLaw && (
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

          <Annotator />
        </LawContext.Provider>
      )}
    </>
  );
}

export default App;

const getJPLaw = async (lawName: string) => {
  const result = await fetch(lawInfo[lawName].path.chikujo!);
  const data_chikujo = await result.text();

  // 対訳HTMLをLawXMLの形式に落とし込む
  const result2 = await fetch(lawInfo[lawName].path.taiyaku!);
  const data_taiyaku = await result2.text();

  const lawHTML = document.createElement("div");
  lawHTML.innerHTML = data_taiyaku;

  const taiyakuLaw: JPLawXML = {
    $: {
      Name: lawInfo[lawName].name,
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
  };

  const law: JPLawXML = taiyakuLaw;
  // ここでarticle一覧を作ってしまう
  law.Article = law.LawBody.MainProvision.Chapter.map((chapter: ChapterXML) => {
    if (chapter.Section) {
      return chapter.Section.map((section: SectionXML) => {
        return section.Article;
      });
    } else if (chapter.Article) {
      return [chapter.Article];
    } else {
      return [];
    }
  })
    .flat(2)
    .reduce((prev: { [articleNum: string]: ArticleXML }, cur: ArticleXML) => {
      prev[cur.$.Num] = cur;
      return prev;
    }, {});

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
  return law;
};

const getEPLaw = async () => {
  // ja
  const result_ja = await fetch(lawInfo["epc"].path.ja!);
  const epc_ja = await result_ja.text();
  const articleTitles = epc_ja.match(/^第[0-9a-z]+条 [^\r\n]+/gm)!;
  const contents = epc_ja.split(/^第[0-9a-z]+条 [^\r\n]+/gm)!.slice(1);
  const ja: {
    [articleNum: string]: { title: string; content: string };
  } = articleTitles.reduce(
    (
      prev: {
        [articleNum: string]: { title: string; content: string };
      },
      cur: string,
      idx: number
    ) => {
      const articleNum = cur.match(/[0-9a-z]+/g)![0];
      prev[articleNum] = {
        title: articleTitles[idx],
        content: contents[idx].trim(),
      };
      return prev;
    },
    {}
  );

  // en
  const result_en = await fetch(lawInfo["epc"].path.en!);
  const epc_html = document.createElement("div");
  epc_html.innerHTML = await result_en.text();

  const articleJSON: {
    [articleNum: string]: { [sentenceID: string]: string };
  } = {};
  const enArr = Array.from(epc_html.querySelectorAll(".pagebody")).map(
    (art) => {
      let [articleTitle, articleCaption] = (
        art.querySelector("p.LMArtReg")! as HTMLElement
      ).innerHTML
        .trim()
        .split("<br>");
      const articleNum = articleTitle.split("&nbsp;")[1].split("<")[0];
      articleJSON[articleNum] = {};
      articleCaption = articleCaption.replace("\n", "").replace(/\s+/g, " ");

      // 以下、content
      let content = "";
      if (art.querySelector("div.LMNormal")) {
        // 箇条書きがない条文の場合
        const sentenceID = `${articleNum}-${Object.keys(
          articleJSON[articleNum]
        ).length.toString()}`;
        const text = `${(
          art.querySelector("div.LMNormal")! as HTMLElement
        ).innerText
          .replace(/\s+/g, " ")
          .replace(/\[ [0-9+] \]/, " ")
          .replace(/\s+/g, " ")
          .trim()}`;
        content = `<span data-sentenceid="${sentenceID}">${text}</span>`;
        articleJSON[articleNum][sentenceID] = text;
      }
      if (art.querySelector("div.DOC4NET2_LMNormal_spc")) {
        // 箇条書きの条文の場合
        content += Array.from(
          art.querySelectorAll("div.DOC4NET2_LMNormal_spc")
        ).reduce((prev: HTMLDListElement, cur: Element) => {
          if (cur.querySelector("div.DOC4NET2_pos_LMNormal_2")) {
            const sentenceID = `${articleNum}-${Object.keys(
              articleJSON[articleNum]
            ).length.toString()}`;
            const text = (
              cur.querySelector("div.DOC4NET2_pos_LMNormal_2") as HTMLElement
            ).innerText
              .replace(/\s+/g, " ")
              .replace(/\[ [0-9+] \]/, " ")
              .replace(/\s+/g, " ")
              .trim();
            const div = document.createElement("div");
            div.innerText = text;
            div.setAttribute("data-sentenceid", sentenceID);
            prev.appendChild(div);
            articleJSON[articleNum][sentenceID] = text;
            return prev;
          }

          const dtNum = (
            cur.querySelector("div.DOC4NET2_pos_LMNormal") as HTMLElement
          ).innerText.match(/(\([0-9a-z]+\))|-/)![0];
          const ddContent = (
            cur.querySelector("div.DOC4NET2_pos_LMNormal_1") as HTMLElement
          ).innerText;
          const dt = document.createElement("dt");
          dt.innerText = dtNum;
          const dd = document.createElement("dd");
          const span = document.createElement("span");
          const text = ddContent
            .replace(/\s+/g, " ")
            .replace(/\[ [0-9+] \]/, " ")
            .replace(/\s+/g, " ")
            .trim();
          span.innerText = text;
          const sentenceID = `${articleNum}-${Object.keys(
            articleJSON[articleNum]
          ).length.toString()}`;
          span.setAttribute("data-sentenceid", sentenceID);
          dd.appendChild(span);

          const div = document.createElement("div");
          div.appendChild(dt);
          div.appendChild(dd);

          if (dtNum === "(a)") {
            const childDl = document.createElement("dl");
            childDl.appendChild(div);

            const dds = prev.querySelectorAll("dd");
            if (dds.length > 0) {
              dds[dds.length - 1].appendChild(childDl);
            } else {
              prev.appendChild(childDl);
            }

            articleJSON[articleNum][sentenceID] = text;
          } else if (/\([b-z]\)/.test(dtNum)) {
            const dls = prev.querySelectorAll("dl");
            dls[dls.length - 1].appendChild(div);
            articleJSON[articleNum][sentenceID] = text;
          } else if (dtNum === "-") {
            if (!prev.querySelector("ul")) {
              const ul = document.createElement("ul");
              prev.appendChild(ul);
            }
            const li = document.createElement("li");
            li.innerText = ddContent;
            li.setAttribute("data-sentenceid", sentenceID);
            prev.querySelector("ul")?.appendChild(li);

            articleJSON[articleNum][sentenceID] = text;
          } else {
            prev.appendChild(div);

            articleJSON[articleNum][sentenceID] = text;
          }

          return prev;
        }, document.createElement("dl")).outerHTML;
      }

      return { articleNum, articleCaption, content };
    }
  );
  console.log({ articleJSON });
  const enObj = enArr.reduce(
    (
      prev: {
        [articleNum: string]: {
          articleNum: string;
          articleCaption: string;
          content: string;
        };
      },
      cur
    ) => {
      prev[cur.articleNum] = {
        articleNum: cur.articleNum,
        articleCaption: cur.articleCaption,
        content: cur.content,
      };
      return prev;
    },
    {}
  );

  return { en: { articleObj: enObj, articleArr: enArr }, ja: ja };
};

// 以下、対訳HTMLのパース用関数
const cleanChapter = (chapterEl: HTMLElement, index: number): ChapterXML => {
  const chapter: any = {};
  chapter.$ = { Num: index + 1 };
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
