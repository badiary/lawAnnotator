export {};
declare global {
  type Law = {
    info: {
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
    content: { [lawName: string]: JPLawXML | EPLawXML };
  };

  type JPLawXML = {
    $: {
      Name: string;
    };
    LawBody: {
      LawTitle: {
        _: string;
      };
      MainProvision: {
        Chapter: ChapterXML[];
      };
    };
    Article: {
      [articleNum: string]: ArticleXML;
    };
    Chikujo: {
      [articleNum: string]: string;
    };
  };

  type ChapterXML = {
    $: { Num: string };
    ChapterTitle: string;
    ChapterTitleEn: string;
    Section?: SectionXML[];
    Article?: ArticleXML[];
  };

  type SectionXML = {
    $: { Num: string };
    SectionTitle: string;
    SectionTitleEn: string;
    Article: ArticleXML[];
  };

  type ArticleXML = {
    $: { Num: string };
    ArticleCaption: string;
    ArticleCaptionEn?: string;
    ArticleTitle: string;
    ArticleTitleEn?: string;
    Paragraph: ParagraphXML[];
  };

  type ParagraphXML = {
    $: { Num: string };
    ParagraphNum: string;
    ParagraphSentence: ParagraphSentenceXML;
    ParagraphSentenceEn: ParagraphSentenceXML;
    Item: ItemXML[];
  };

  type ParagraphSentenceXML = {
    $: { Num: string };
    Sentence: SentenceXML[] | SentenceXML;
  };

  type SentenceXML = {
    $: { Num: string };
    _: string;
  };

  type ItemXML = {
    $: { Num: string };
    ItemTitle: string;
    ItemTitleEn: string;
    ItemSentence: ItemSentenceXML;
    ItemSentenceEn: ItemSentenceXML;
  };

  type ItemSentenceXML = {
    Sentence: SentenceXML[] | SentenceXML;
    Column?: ColumnXML[] | ColumnXML;
  };

  type ColumnXML = {
    $: { Num: string };
    Sentence: SentenceXML[] | SentenceXML;
  };

  type EPLawXML = {
    en: {
      articleObj: {
        [articleNum: string]: {
          articleNum: string;
          articleCaption: string;
          content: string;
        };
      };
      articleArr: {
        articleNum: string;
        articleCaption: string;
        content: string;
      }[];
    };
    ja: {
      [articleNum: string]: { title: string; content: string };
    };
  };

  type TextLabelUnit = {
    start: number;
    end: number;
    labelName: string;
    text: string;
  };

  type LawState = {
    relation: { [articleNum: string]: Set<string> };
    textLabel: {
      [articleNumPair: string]: { [sentenceID: string]: TextLabel[] };
    };
    targetedArticleNum?: string;
    pairedArticleNum?: string;
  };

  type DispatchAction = {
    type: "load" | "target" | "addArticle" | "deleteArticle" | "text";
    lawState?: LawState;
    selectedLaw?: string;
    articleNum?: string;
    text?: {
      sentenceID: string;
      textLabels: TextLabel[];
    };
    json?: string;
  };

  type ArticleStatus = "none" | "target" | "labeled" | "paired";
  type LabelName = "definition" | "defined" | "overwriting" | "overwritten";
}
