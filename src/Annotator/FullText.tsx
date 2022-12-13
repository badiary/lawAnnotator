import React from "react";
import { CommonProps } from "./Annotator";
import FullTextEP from "./FullTextEP";
import FullTextJP from "./FullTextJP";
interface FullTextProps extends Omit<CommonProps, "relation"> {
  relatedArticleNumSet: Set<string>;
}
function FullText(props: FullTextProps) {
  return (
    <div id="fulltext">
      {(props.selectedLaw === "jpPatent" || props.selectedLaw === "jpUtil") && (
        <FullTextJP {...props} />
      )}
      {props.selectedLaw === "epc" && <FullTextEP {...props} />}
    </div>
  );
}

export default FullText;
