import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import type { ExportInput, ExportResult, Icon } from "./types";
import { createHash } from "node:crypto";

const tags = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "defs",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "use",
  "symbol",
  "title",
  "desc",
  "pattern",
  "marker",
]);
const attributes = new Set([
  "xmlns",
  "xmlns:xlink",
  "viewBox",
  "width",
  "height",
  "x",
  "y",
  "x1",
  "x2",
  "y1",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "d",
  "points",
  "fill",
  "stroke",
  "fill-rule",
  "clip-rule",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "stroke-dashoffset",
  "fill-opacity",
  "stroke-opacity",
  "opacity",
  "transform",
  "id",
  "href",
  "xlink:href",
  "clip-path",
  "mask",
  "gradientUnits",
  "gradientTransform",
  "offset",
  "stop-color",
  "stop-opacity",
  "spreadMethod",
  "patternUnits",
  "patternContentUnits",
  "patternTransform",
  "preserveAspectRatio",
  "color",
  "vector-effect",
  "role",
  "aria-hidden",
  "aria-label",
  "pathLength",
  "version",
  "overflow",
  "display",
  "visibility",
  "shape-rendering",
  "color-interpolation",
  "clipPathUnits",
  "maskUnits",
  "maskContentUnits",
  "marker-start",
  "marker-mid",
  "marker-end",
  "markerWidth",
  "markerHeight",
  "markerUnits",
  "refX",
  "refY",
  "orient",
]);

export function parseSvg(svg: string) {
  if (Buffer.byteLength(svg) > 1_000_000 || /<!DOCTYPE|<!ENTITY/i.test(svg))
    throw new Error("SVG 过大或包含禁止的 XML 声明");
  let invalid = false;
  const doc = new DOMParser({
    errorHandler: {
      warning: () => {
        invalid = true;
      },
      error: () => {
        invalid = true;
      },
      fatalError: () => {
        invalid = true;
      },
    },
  }).parseFromString(svg, "image/svg+xml");
  if (invalid || doc.documentElement?.tagName !== "svg")
    throw new Error("无效的 SVG 文件");
  return doc;
}
export function sanitizeSvg(svg: string): string {
  const doc = parseSvg(svg);
  const elements = [
    doc.documentElement,
    ...Array.from(doc.documentElement.getElementsByTagName("*")),
  ];
  const identifiers = new Map<string, string>();
  for (const element of elements) {
    const id = element.getAttribute("id");
    if (id) {
      if (identifiers.has(id)) throw new Error("SVG 内部标识重复");
      identifiers.set(
        id,
        /^[A-Za-z_][\w:.-]*$/.test(id)
          ? id
          : `i-${createHash("sha256").update(id).digest("hex").slice(0, 16)}`,
      );
    }
    const style = element.getAttribute("style");
    if (style) {
      for (const declaration of style
        .split(";")
        .filter((value) => value.trim())) {
        const colon = declaration.indexOf(":");
        const property = declaration.slice(0, colon).trim(),
          value = declaration.slice(colon + 1).trim();
        if (
          colon < 1 ||
          ![
            "fill",
            "stroke",
            "stroke-width",
            "stroke-linecap",
            "stroke-linejoin",
            "stroke-dasharray",
            "stroke-dashoffset",
            "opacity",
            "fill-opacity",
            "stroke-opacity",
            "fill-rule",
            "clip-rule",
            "display",
            "overflow",
            "visibility",
            "color",
            "stop-color",
            "stop-opacity",
          ].includes(property)
        )
          throw new Error("SVG 包含不支持的内联样式");
        element.setAttribute(property, value);
      }
      element.removeAttribute("style");
    }
  }
  for (const element of elements)
    for (const attribute of Array.from(element.attributes)) {
      let value = attribute.value;
      if (attribute.name === "id") value = identifiers.get(value)!;
      else
        for (const [original, normalized] of identifiers) {
          if (value === `#${original}`) value = `#${normalized}`;
          for (const quoted of [
            `url(#${original})`,
            `url('#${original}')`,
            `url("#${original}")`,
          ])
            value = value.replaceAll(quoted, `url(#${normalized})`);
        }
      element.setAttribute(attribute.name, value);
    }
  const walk = (node: Element) => {
    if (!tags.has(node.tagName))
      throw new Error(`SVG 包含不支持或不安全的元素：${node.tagName}`);
    for (const attr of Array.from(node.attributes)) {
      if (attr.name === "id" && !/^[A-Za-z_][\w:.-]*$/.test(attr.value))
        throw new Error("SVG 内部标识无效");
      if (
        !attributes.has(attr.name) ||
        (/javascript:|data:|https?:|file:|@import|expression\(/i.test(
          attr.value,
        ) &&
          !attr.name.startsWith("xmlns"))
      )
        throw new Error(`SVG 包含不支持或不安全的属性：${attr.name}`);
      if (
        (attr.name === "href" || attr.name === "xlink:href") &&
        !/^#[\w:.-]+$/.test(attr.value)
      )
        throw new Error("SVG 禁止外部引用");
      for (const match of attr.value.matchAll(/url\(([^)]+)\)/gi))
        if (!/^(#[\w:.-]+|'#[\w:.-]+'|"#[\w:.-]+")$/.test(match[1].trim()))
          throw new Error("SVG 禁止外部资源");
      if (/url\(/i.test(attr.value))
        node.setAttribute(
          attr.name,
          attr.value.replace(/url\(\s*['"]?(#[\w:.-]+)['"]?\s*\)/gi, "url($1)"),
        );
    }
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 1) walk(child as unknown as Element);
      else if (child.nodeType === 7) throw new Error("SVG 禁止处理指令");
    }
  };
  walk(doc.documentElement as unknown as Element);
  const root = doc.documentElement;
  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (!root.hasAttribute("viewBox")) {
    const w = Number(root.getAttribute("width")),
      h = Number(root.getAttribute("height"));
    if (!(w > 0 && h > 0)) throw new Error("SVG 必须包含 viewBox 或有效尺寸");
    root.setAttribute("viewBox", `0 0 ${w} ${h}`);
  }
  const viewBox = (root.getAttribute("viewBox") ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    viewBox.length !== 4 ||
    !viewBox.every(Number.isFinite) ||
    viewBox[2] <= 0 ||
    viewBox[3] <= 0
  )
    throw new Error("SVG viewBox 无效");
  return new XMLSerializer().serializeToString(root);
}
export function normalizedSvg(svg: string, size = 24, color?: string) {
  const doc = parseSvg(sanitizeSvg(svg));
  const root = doc.documentElement;
  root.setAttribute("width", String(size));
  root.setAttribute("height", String(size));
  if (color) {
    root.setAttribute("color", color);
    const nodes = [root, ...Array.from(root.getElementsByTagName("*"))];
    const paints = new Set(
      nodes.flatMap((node) =>
        ["fill", "stroke"]
          .map((name) => node.getAttribute(name))
          .filter((value): value is string =>
            Boolean(value && value !== "none" && value !== "transparent"),
          ),
      ),
    );
    if (
      paints.size <= 1 &&
      !Array.from(paints).some((value) => value.startsWith("url("))
    ) {
      if (!root.hasAttribute("fill")) root.setAttribute("fill", "currentColor");
      for (const node of nodes)
        for (const name of ["fill", "stroke"]) {
          const value = node.getAttribute(name);
          if (value && value !== "none" && value !== "transparent")
            node.setAttribute(name, "currentColor");
        }
    }
  }
  return new XMLSerializer().serializeToString(root);
}
const jsxNames: Record<string, string> = {
  class: "className",
  "fill-rule": "fillRule",
  "clip-rule": "clipRule",
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-miterlimit": "strokeMiterlimit",
  "stroke-dasharray": "strokeDasharray",
  "stroke-dashoffset": "strokeDashoffset",
  "fill-opacity": "fillOpacity",
  "stroke-opacity": "strokeOpacity",
  "clip-path": "clipPath",
  "stop-color": "stopColor",
  "stop-opacity": "stopOpacity",
  "xlink:href": "xlinkHref",
  "xmlns:xlink": "xmlnsXlink",
  "vector-effect": "vectorEffect",
  "shape-rendering": "shapeRendering",
  "color-interpolation": "colorInterpolation",
  "marker-start": "markerStart",
  "marker-mid": "markerMid",
  "marker-end": "markerEnd",
};
function componentName(name: string) {
  const result = name
    .split(/[^\w]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
  return `Icon${result || "Resource"}`;
}
function namespaceSvg(svg: string, prefix: string) {
  const doc = parseSvg(svg),
    root = doc.documentElement,
    nodes = [root, ...Array.from(root.getElementsByTagName("*"))];
  const ids = nodes
    .map((node) => node.getAttribute("id"))
    .filter((id): id is string => Boolean(id));
  for (const node of nodes)
    for (const attribute of Array.from(node.attributes)) {
      let value = attribute.value;
      if (attribute.name === "id") value = `${prefix}-${value}`;
      else
        for (const id of ids) {
          if (value === `#${id}`) value = `#${prefix}-${id}`;
          value = value.replaceAll(`url(#${id})`, `url(#${prefix}-${id})`);
        }
      node.setAttribute(attribute.name, value);
    }
  return new XMLSerializer().serializeToString(root);
}

export function exportIcon(icon: Icon, input: ExportInput): ExportResult {
  const size = input.size ?? 24;
  let svg = normalizedSvg(icon.svg, size, input.color);
  const name = componentName(icon.name);
  const stem = icon.name.replace(/[^a-zA-Z0-9_-]/g, "-") || "icon";
  const digest = createHash("sha256").update(icon.id).digest("hex").slice(0, 8);
  const assetName = `${stem}-${digest}`;
  if (input.target === "svg" || input.target === "html")
    svg = namespaceSvg(svg, `icon-${digest}`);
  const attribution = `Source: ${icon.sourceUrl}${icon.commit ? ` @ ${icon.commit}` : ""}${icon.license ? ` | License: ${icon.license}${icon.licenseUrl ? ` (${icon.licenseUrl})` : ""}` : ""}`;
  let code = svg,
    files = [{ path: `${assetName}.svg`, content: svg }],
    instructions = "将 SVG 文件加入项目，或直接复制 SVG 标记";
  if (input.target === "html") {
    code = `<!-- ${attribution.replace(/--/g, "")} -->\n${svg}`;
    files = [{ path: `${assetName}.html`, content: code }];
    instructions = "将标记嵌入 HTML；currentColor 图标继承父元素文字颜色";
  }
  if (input.target === "react" || input.target === "vue") {
    const doc = parseSvg(svg),
      root = doc.documentElement;
    const ids = Array.from(root.getElementsByTagName("*"))
      .map((node) => node.getAttribute("id"))
      .filter(Boolean);
    if (root.hasAttribute("id")) ids.push(root.getAttribute("id"));
    let markup = new XMLSerializer()
      .serializeToString(root)
      .replaceAll("{", "&#123;")
      .replaceAll("}", "&#125;");
    if (input.target === "react") {
      for (const [from, to] of Object.entries(jsxNames))
        markup = markup.replace(new RegExp(`\\b${from}="`, "g"), `${to}="`);
      for (const id of ids) {
        markup = markup.replaceAll(`id="${id}"`, `id={\`${"${uid}"}-${id}\`}`);
        markup = markup.replaceAll(`="#${id}"`, `={\`#${"${uid}"}-${id}\`}`);
        markup = markup.replaceAll(
          `="url(#${id})"`,
          `={\`url(#${"${uid}"}-${id})\`}`,
        );
      }
      markup = markup
        .replace(/<svg([^>]*)>/, "<svg$1 {...props}>")
        .replace(`width="${size}"`, "width={size}")
        .replace(`height="${size}"`, "height={size}");
      code = `// ${attribution}\nimport { useId, type SVGProps } from 'react';\n\nexport function ${name}({ size = ${size}, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {\n  const uid = useId().replace(/:/g, '');\n  return (${markup});\n}\n`;
      files = [{ path: `${name}.tsx`, content: code }];
      instructions = `导入 ${name}，使用 <${name} size={24} />；支持标准 SVG 属性`;
    } else {
      markup = markup.replaceAll("xlink:href=", "href=");
      for (const id of ids) {
        markup = markup.replaceAll(`id="${id}"`, `:id="uid + '-${id}'"`);
        markup = markup.replaceAll(
          `href="#${id}"`,
          `:href="'#' + uid + '-${id}'"`,
        );
        markup = markup.replaceAll(
          `="url(#${id})"`,
          `="\`url(#\${uid}-${id})\`"`,
        );
      }
      markup = markup
        .replace(/ ([\w-]+)="`url\(/g, ' :$1="`url(')
        .replace(`width="${size}"`, ':width="size"')
        .replace(`height="${size}"`, ':height="size"');
      code = `<!-- ${attribution.replace(/--/g, "")} -->\n<script setup lang="ts">\nimport { useId } from 'vue';\nwithDefaults(defineProps<{ size?: number }>(), { size: ${size} });\nconst uid = useId();\n</script>\n\n<template>\n${markup}\n</template>\n`;
      files = [{ path: `${name}.vue`, content: code }];
      instructions = `导入 ${name}，使用 <${name} :size="24" />；要求 Vue 3.5+`;
    }
  }
  if (input.target === "swiftui") {
    const monochrome =
      !/<(?:linearGradient|radialGradient)/.test(svg) &&
      new Set(
        [...svg.matchAll(/(?:fill|stroke)="([^"\s]+)"/g)]
          .map((match) => match[1])
          .filter((value) => value !== "none" && value !== "transparent"),
      ).size <= 1;
    const template =
      monochrome && (!input.color || input.color === "currentColor");
    const nativeSvg = svg.replaceAll(
      "currentColor",
      !input.color || input.color === "currentColor" ? "#000000" : input.color,
    );
    code = `// ${attribution}\nImage("${assetName}")\n    .resizable()\n    .scaledToFit()\n    .frame(width: ${size}, height: ${size})${template ? "\n    .foregroundStyle(.primary)" : ""}`;
    files = [
      { path: `${assetName}.imageset/${assetName}.svg`, content: nativeSvg },
      {
        path: `${assetName}.imageset/Contents.json`,
        content: JSON.stringify(
          {
            images: [{ filename: `${assetName}.svg`, idiom: "universal" }],
            info: { author: "xcode", version: 1 },
            properties: {
              "preserves-vector-representation": true,
              "template-rendering-intent": template ? "template" : "original",
            },
          },
          null,
          2,
        ),
      },
      { path: `${assetName}.swift`, content: code },
    ];
    instructions =
      "将 .imageset 文件夹拖入 Assets.xcassets，再使用以下 SwiftUI 代码；SVG 由 Xcode 导入，非运行时字符串加载";
  }
  files.push({ path: `${assetName}.source.txt`, content: attribution });
  return {
    target: input.target,
    code,
    files,
    icon,
    previewSvg: svg,
    instructions,
  };
}
