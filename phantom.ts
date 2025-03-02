function PHANTOM(reduxStore: any, XDOM: XDOMFunction) {
  let pseudoDOM: pseudoDOM = {
    test: {
      tagName: "div",
      attributes: { id: "PHANTOM" },
      children: [],
      innerHTML: "",
      dataset: {},
    },
  };

  function launchDOM() {
    const body = document.body;
    if (!document.querySelector("#PHANTOM")) {
      const PHANTOM = document.createElement("div");
      PHANTOM.id = "PHANTOM";
      body?.appendChild(PHANTOM);
    }
    const DOM = renderPseudoElement();
    swapElement(DOM, document.querySelector("#PHANTOM"));
    return DOM;
  }

  function coalescePhantomDOM() {
    return `
    <div id="PHANTOM">
      ${XDOM()}
    </div>
    `;
  }

  function renderPseudoElement(
    pseudoElement = transmuteHTMLtoPseudoElement(coalescePhantomDOM())
  ) {
    const { tagName, attributes, innerHTML, children } = pseudoElement;
    let $children: PseudoElement[] = [];

    if (children && children.length) {
      ($children as unknown) = Array.prototype.map.call(children, (child) => {
        renderPseudoElement(child);
      });
    }

    let DOMElement;

    // DOM diffing ahead. ↓↓↓
    // We look at the current pseudoDOM, and for every pseudoDOMNode, if
    // * the id of the pseudoDOMNode and current pseudoElement match, and
    // * the nodes' dataset (data-phantom) are different (their data has changed),
    // we swap the nodes.
    Object.values(pseudoDOM).map((pseudoDOMNode: any) => {
      if (
        pseudoDOMNode.attributes.id === pseudoElement.attributes.id &&
        JSON.stringify(pseudoDOMNode.dataset) !==
          JSON.stringify(pseudoElement.dataset)
      ) {
        let newNode = document.createElement(tagName);
        for (const [k, v] of Object.entries(attributes)) {
          newNode.setAttribute(k, v as string);
        }
        newNode.innerHTML = innerHTML;

        let targetNode = document.getElementById(attributes.id);
        swapElement(newNode, targetNode);
        DOMElement = newNode;
      }
    });

    pseudoDOM[attributes.id] = pseudoElement;
    DOMElement = document.createElement(tagName);

    for (const [k, v] of Object.entries(attributes)) {
      DOMElement.setAttribute(k, v as string);
    }

    DOMElement.innerHTML = innerHTML;
    return DOMElement;
  }

  function transmuteHTMLtoPseudoElement(html: string) {
    if (typeof html !== "string") html = (html as HTMLElement).outerHTML;
    // TODO: find a better solution to mapped elements ↓↓↓
    html = html.replace(/>,/g, ">"); // ← remove commas from mapped element arrays
    let doc = new DOMParser().parseFromString(html, "text/html");
    const $el = doc.body.firstChild;
    const {
      tagName,
      children,
      id,
      dataset,
      classList,
      innerHTML,
      outerHTML,
    } = $el as HTMLElement;

    let $children: PseudoElement[] = [];

    if (children && children.length) {
      ($children as unknown) = Array.prototype.map.call(children, (child) => {
        return transmuteHTMLtoPseudoElement(child);
      });
    }
    return {
      tagName,
      attributes: {
        id,
        class: classList,
      },
      dataset,
      children: $children,
      innerHTML,
      outerHTML,
    };
  }

  function swapElement(
    swapIn: Text | HTMLElement,
    swapOut: ChildNode | null | undefined
  ) {
    swapOut?.replaceWith(swapIn);
    return swapIn;
  }

  reduxStore.subscribe(() => {
    renderPseudoElement();
  });

  return {
    fire: reduxStore.dispatch,
    data: reduxStore.getState,
    launch: launchDOM,
  };
}

export default PHANTOM;
