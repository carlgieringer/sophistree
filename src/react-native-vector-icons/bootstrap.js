// Use the prebuilt version of RNVI located in the dist folder
import Icon from "react-native-vector-icons/dist/FontAwesome";

// Generate the required CSS
import iconFont from "react-native-vector-icons/Fonts/FontAwesome.ttf";
const iconFontStyles = `@font-face {
    src: url(${iconFont});
    font-family: FontAwesome;
  }`;

// Create a stylesheet
const style = document.createElement("style");
style.type = "text/css";

// Append the iconFontStyles to the stylesheet
if (style.styleSheet) {
  style.styleSheet.cssText = iconFontStyles;
} else {
  style.appendChild(document.createTextNode(iconFontStyles));
}

// Inject the stylesheet into the document head
document.head.appendChild(style);
