# RelaxNGui

Annotate RelaxNG schemas and use them as UI templates to generate/edit XML files in HTML forms.

Sorry: requires jquery. Feel free to remove this dependency and send a pull request.

Also requires [uidashjs](https://www.npmjs.com/package/uidashjs): uidash_util.js
provides $XR and $.fn.serializeXML, uidash-icons.css provides the icons. So load
jquery, then uidash_util.js, then relaxngui.js (plus uidash-icons.css and
relaxngui.css).

```bash
npm install relaxnguijs
```

## Usage

```html
<script src="node_modules/jquery/dist/jquery.min.js"></script>
<script src="node_modules/uidashjs/uidash_util.js"></script>
<script src="node_modules/relaxnguijs/relaxngui.js"></script>
<link rel="stylesheet" href="node_modules/uidashjs/uidash-icons.css"/>
<link rel="stylesheet" href="node_modules/relaxnguijs/relaxngui.css"/>

<div id="form"></div>
<button id="save">Save</button>

<script>
  $(document).ready(async function(){
    const rng  = await $.ajax({ url: 'order.rng', dataType: 'xml' });
    const data = await $.ajax({ url: 'order.xml', dataType: 'xml' });

    const gui = new RelaxNGui(rng, $('#form'));  // render the form
    gui.content(data);                           // optional: fill it with an existing document

    $('#form').on('relaxngui_change', () => console.log('changed:', gui.has_changed()));
    $('#save').on('click', () => console.log(gui.save_text()));
  });
</script>
```

### Constructor

```js
new RelaxNGui(rng, target, ceval, ignore = false, upload = true)
```

| Parameter | Meaning |
|-----------|---------|
| `rng`     | The annotated RelaxNG schema, as `XMLDocument` or as XML string. |
| `target`  | jQuery object the form is rendered into. |
| `ceval`   | Optional function used instead of `eval` for `javascript:` values in `rngui:default` and `rngui:href` (e.g. to evaluate them in your own scope). |
| `ignore`  | If `true`, all schema elements carrying `rngui:ignore` are skipped. |
| `upload`  | If `false`, no upload button is shown for fields with `rngui:filehandler`. |

### Methods

| Method | Returns |
|--------|---------|
| `content(xml)` | Fills the form from an XML document (`XMLDocument` or string). Repeated elements are created as needed, then `rngui:oninit` handlers run and a checkpoint is set. |
| `save()` | The form content as `XMLDocument`. Invisible parts (`rngui:visible="false"`, or hidden by a choice) and empty optional elements are left out. |
| `save_text()` | The same, as pretty printed XML string. |
| `save_object()` | The form content as JavaScript object: attributes become `@name` keys, mixed text becomes `#text`, repeated elements become arrays (always arrays when the schema says they may repeat). |
| `save_json()` | `save_object()` as JSON string. |
| `set_checkpoint()` / `has_changed()` | Remember the current state / check if the user changed something since then. |

Helpers meant to be called from `rngui:onchange` / `rngui:oninit` code (where the
instance is available as `self`). Paths are written like `'> order > items'`
(element names from the root, separated by `>`):

| Helper | Effect |
|--------|--------|
| `self.relaxngui_toggle(path, ...)` | Toggle visibility of the elements at the paths. |
| `self.relaxngui_show(what, val, path, ...)` / `self.relaxngui_hide(...)` | Show / hide the paths if the value of field `what` (e.g. `current_element`) equals `val`. |
| `self.relaxngui_switch_visibility(what, val, path, ...)` | Show the paths if `what` equals `val`, hide them otherwise. |
| `self.relaxngui_visible(val, path, ...)` / `self.relaxngui_hidden(...)` | Same as show / hide, for `rngui:oninit` (compares against the initialised element). |

### Events

Triggered on `target`: `relaxngui_change` (a value changed, an entry was added
or removed), `relaxngui_remove` (an entry of a list was removed) and
`relaxngui_move` (an entry of a list was moved by drag and drop).

## Writing a RelaxNGui Schema

A RelaxNGui schema is a normal RelaxNG schema (XML syntax) with additional
attributes and elements in the namespace `http://rngui.org` (usually prefixed
`rngui`). Only things with a `rngui:label` (or `rngui:header`) are shown; an
element without any annotation is still part of the generated XML, but has no
visible field.

### Supported RelaxNG constructs

| Construct | Rendered as |
|-----------|-------------|
| `<element name="...">` | A row (with `rngui:label`) and/or a section (with `rngui:header`). Nested elements are nested sections. An `ns` attribute sets the namespace of the generated element. |
| `<attribute name="...">` | A row inside its element (needs `rngui:label`). |
| `<element>` with `<anyName/>` | A key/value row: the user types the element name and its value. |
| `<data type="string">` | Text input. |
| `<data type="integer">`, `nonNegativeInteger`, `positiveInteger`, `float` | Text input restricted to numbers of that kind. |
| `<data type="date">` | Text input restricted to `YYYY-MM-DD`. |
| `<data type="boolean">` | Checkbox. |
| `<param name="minInclusive">`, `maxInclusive`, `pattern` | Restrict the input of the enclosing `<data>`. |
| `<text/>` | Multi line text field (one `<li>` per line). |
| `<choice>` of `<value>`s | Select box (or color picker, see `rngui:type`). |
| `<choice>` of `<element>`s | Select box that shows only the selected alternative; only that alternative is saved. |
| `<zeroOrMore>` | A list with an add button; entries can be deleted and reordered. |
| `<optional>` | The contained fields are marked optional; empty ones are not saved. |

Other constructs (`oneOrMore`, `group`, `interleave`, `ref`/`define`, ...) are
not rendered.

### rngui attributes

| Attribute | Allowed on | Meaning |
|-----------|-----------|---------|
| `rngui:version` | root element | Version of the annotation format (currently `1.2`), informational. |
| `rngui:label` | `element`, `attribute` | Label of the row. |
| | `data`, `text` | Placeholder (and tooltip) of the input. |
| | `element` with `anyName` | Placeholder of the name input. |
| | `zeroOrMore` | Text of the add button. |
| | `value` | Text shown in the select box (default: the value itself). |
| | `choice` of elements | Label of the select box. |
| `rngui:labellength` | `element`, `attribute` | Width of the label column in px (default: measured from the longest label). |
| `rngui:labeltype` | `element` with `anyName` | `xml` allows full XML names (with `-` and uppercase) for the name input. |
| `rngui:header` | `element` | Section header shown above the element's content. |
| `rngui:fold` | `element` with `rngui:header` | Make the section foldable: `open`, `closed`, or `closed_conditional` (closed unless one of its fields has a value). |
| `rngui:hint` | `element`, `attribute` | Help text shown below the row. |
| `rngui:default` | `element`, `attribute` | Default value. A value starting with `javascript:` is evaluated (see `ceval`). |
| `rngui:visible` | `element`, `attribute` | `false` hides it; hidden things are not saved. |
| `rngui:readonly` | `data` | `true` makes the input read only. |
| `rngui:wrap` | `text` | `true` wraps long lines. |
| `rngui:ignore` | any | Skipped if the constructor is called with `ignore = true`. |
| `rngui:unique` | `anyName` | `true`: names must be unique within the list. |
| `rngui:type` | `choice` | `color`: render the values (CSS colors) as color picker. |
| `rngui:href`, `rngui:extract` | `choice` | Load the options from a URL (`javascript:` allowed); `rngui:extract` is evaluated with the response in `data` and must return `[[label, value], ...]`. |
| `rngui:name` | `choice` of elements | Name of the (UI only) selector element. |
| `rngui:choice_label` | `element` in a `choice` | Text of this alternative in the select box (default: element name). |
| `rngui:onchange` | `element`, `attribute` | JavaScript evaluated when the value changes (or, on an element containing a list, when entries are added/removed). Available: `self`, `current_element`, `current_element_main`. |
| `rngui:oninit` | `element`, `attribute` | JavaScript evaluated after `content()` filled the form. |
| `rngui:filehandler` | `data type="string"` | Adds a file upload button. The code is evaluated with `file` (the `File`) and `content` (a `FileReader`, `content.result` holds an `ArrayBuffer`); its result (an URL) becomes the value. |

### rngui elements

| Element | Meaning |
|---------|---------|
| `<attribute name="rngui-nonfunctional"/>` | Inside an `element`: the element is only there for the UI (e.g. a switch that toggles other fields). It is saved with `rngui-nonfunctional="true"`, so consumers can ignore it. |
| `<rngui:script>...</rngui:script>` | Inside an `element`: JavaScript that is added to the form as `<script>`. |

### Example

`order.rng`:

```xml
<element name="order" rngui:version="1.2" rngui:header="Order"
         datatypeLibrary="http://www.w3.org/2001/XMLSchema-datatypes"
         xmlns="http://relaxng.org/ns/structure/1.0" xmlns:rngui="http://rngui.org">
  <attribute name="id" rngui:label="Order ID">
    <data type="string" rngui:label="e.g. A-42"/>
  </attribute>
  <element name="customer" rngui:label="Customer">
    <data type="string" rngui:label="Full name"/>
  </element>
  <element name="priority" rngui:label="Priority" rngui:hint="High priority orders are shipped first.">
    <choice>
      <value rngui:label="Normal">normal</value>
      <value rngui:label="High">high</value>
    </choice>
  </element>
  <element name="quantity" rngui:label="Quantity">
    <data type="positiveInteger" rngui:label="Number of items">
      <param name="maxInclusive">100</param>
    </data>
  </element>
  <optional>
    <element name="note" rngui:label="Note">
      <text rngui:label="Anything else?" rngui:wrap="true"/>
    </element>
  </optional>
  <element name="items" rngui:header="Items" rngui:fold="open">
    <zeroOrMore rngui:label="Add Item">
      <element name="item" rngui:label="Article">
        <data type="string" rngui:label="Article number"/>
      </element>
    </zeroOrMore>
  </element>
  <element name="extras" rngui:header="Extras" rngui:fold="closed">
    <zeroOrMore rngui:label="Add Extra">
      <element rngui:label="Name">
        <anyName rngui:unique="true"/>
        <data type="string" rngui:label="Value"/>
      </element>
    </zeroOrMore>
  </element>
</element>
```

This renders a form with the fields *Order ID*, *Customer*, *Priority* (a select
box with a hint), *Quantity* (1-100) and an optional *Note*, followed by a
foldable *Items* section with an *Add Item* button and a closed *Extras*
section where arbitrary name/value pairs can be added. `save_text()` then
returns something like:

```xml
<order id="A-42">
  <customer>Jane Doe</customer>
  <priority>high</priority>
  <quantity>3</quantity>
  <items>
    <item>4711</item>
    <item>0815</item>
  </items>
  <extras>
    <giftwrap>yes</giftwrap>
  </extras>
</order>
```

and `save_json()`:

```json
{
  "@id": "A-42",
  "customer": "Jane Doe",
  "priority": "high",
  "quantity": "3",
  "items": { "item": [ "4711", "0815" ] },
  "extras": { "giftwrap": "yes" }
}
```

More examples can be found in the `tests` directory (open the `.html` files
through a web server).
