(window.webpackJsonp=window.webpackJsonp||[]).push([[37],{177:function(e,t,n){"use strict";n.d(t,"a",(function(){return s})),n.d(t,"b",(function(){return b}));var r=n(0),a=n.n(r);function i(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function c(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){i(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},i=Object.keys(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var u=a.a.createContext({}),p=function(e){var t=a.a.useContext(u),n=t;return e&&(n="function"==typeof e?e(t):c(c({},t),e)),n},s=function(e){var t=p(e.components);return a.a.createElement(u.Provider,{value:t},e.children)},m={inlineCode:"code",wrapper:function(e){var t=e.children;return a.a.createElement(a.a.Fragment,{},t)}},d=a.a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,i=e.originalType,o=e.parentName,u=l(e,["components","mdxType","originalType","parentName"]),s=p(n),d=r,b=s["".concat(o,".").concat(d)]||s[d]||m[d]||i;return n?a.a.createElement(b,c(c({ref:t},u),{},{components:n})):a.a.createElement(b,c({ref:t},u))}));function b(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var i=n.length,o=new Array(i);o[0]=d;var c={};for(var l in t)hasOwnProperty.call(t,l)&&(c[l]=t[l]);c.originalType=e,c.mdxType="string"==typeof e?e:r,o[1]=c;for(var u=2;u<i;u++)o[u]=n[u];return a.a.createElement.apply(null,o)}return a.a.createElement.apply(null,n)}d.displayName="MDXCreateElement"},93:function(e,t,n){"use strict";n.r(t),n.d(t,"frontMatter",(function(){return o})),n.d(t,"metadata",(function(){return c})),n.d(t,"rightToc",(function(){return l})),n.d(t,"default",(function(){return p}));var r=n(2),a=n(6),i=(n(0),n(177)),o={id:"cancelAnimation",title:"cancelAnimation",sidebar_label:"cancelAnimation"},c={id:"api/cancelAnimation",title:"cancelAnimation",description:"Starts a time-based animation.",source:"@site/docs/api/cancelAnimation.md",permalink:"/react-native-reanimated/docs/next/api/cancelAnimation",editUrl:"https://github.com/software-mansion/react-native-reanimated/tree/master/docs/docs/api/cancelAnimation.md",version:"next",sidebar_label:"cancelAnimation",sidebar:"docs",previous:{title:"withDecay",permalink:"/react-native-reanimated/docs/next/api/withDecay"},next:{title:"withDelay",permalink:"/react-native-reanimated/docs/next/api/withDelay"}},l=[{value:"Arguments",id:"arguments",children:[]},{value:"Example",id:"example",children:[]}],u={rightToc:l};function p(e){var t=e.components,n=Object(a.a)(e,["components"]);return Object(i.b)("wrapper",Object(r.a)({},u,n,{components:t,mdxType:"MDXLayout"}),Object(i.b)("p",null,"Starts a time-based animation."),Object(i.b)("h3",{id:"arguments"},"Arguments"),Object(i.b)("h4",{id:"sharedvalue-sharedvalueref"},Object(i.b)("inlineCode",{parentName:"h4"},"sharedValue")," ","[SharedValueRef]"),Object(i.b)("p",null,"The value for which we want the previously started animation to be cancelled.\nIf there was no animation started on that value, or the animation completed, no error will be thrown."),Object(i.b)("h2",{id:"example"},"Example"),Object(i.b)("pre",null,Object(i.b)("code",Object(r.a)({parentName:"pre"},{className:"language-js",metastring:"{5}","{5}":!0}),"const someValue = useSharedValue(0);\n\nconst gestureHandler = useAnimatedGestureHandler({\n  onStart: (_, ctx) => {\n    cancelAnimation(someValue);\n  },\n});\n")))}p.isMDXComponent=!0}}]);