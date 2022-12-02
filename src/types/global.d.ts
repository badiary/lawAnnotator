import { electronAPI } from "../preload";
import { Sat } from "../Annotator/sat";
declare global {
  type LawXML = {
    $: {
      // Era: string;
      // Year: string;
      // PromulgateMonth: string;
      // PromulgateDay: string;
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
    initialState?: {
      relation: { [articleNum: string]: string[] };
      textLabel: {
        [articleNumPair: string]: { [sentenceID: string]: TextLabel[] };
      };
      targetedArticleNum?: string;
      pairedArticleNum?: string;
      textHighlighterOption?: TextHighlighterOption;
    };
    sat: Sat;
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

  type TextLabelUnit = {
    start: number;
    end: number;
    labelName: string;
    text: string;
  };

  type AnnotatorState = {
    relation: { [articleNum: string]: Set<string> };
    textLabel: {
      [articleNumPair: string]: { [sentenceID: string]: TextLabel[] };
    };
    targetedArticleNum?: string;
    pairedArticleNum?: string;
    textHighlighterOption?: TextHighlighterOption;
  };
  type DispatchAction = {
    type: "update" | "target" | "addArticle" | "deleteArticle" | "text";
    annotatorState?: AnnotatorState;
    articleNum: string;
    text?: {
      sentenceID: string;
      textLabels: TextLabel[];
    };
  };

  type TextHighlighterOption = {
    words: string[];
    className: { [word: string]: string };
    query: string;
  };

  type ArticleStatus = "none" | "target" | "labeled";
  type LabelName =
    | "definition"
    | "defined"
    | "reference"
    | "referred"
    | "overwriting"
    | "overwritten";
}
