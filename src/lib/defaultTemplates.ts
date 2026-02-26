export const Q5_TEMPLATE_ENTRY_ID = "template-q5-site-directed-mutagenesis-v2";

export const Q5_TEMPLATE_ENTRY = {
  id: Q5_TEMPLATE_ENTRY_ID,
  title: "Template: Q5 Site-Directed Mutagenesis (Quick Protocol)",
  description: "Reference/template protocol for Q5 mutagenesis; clone before editing for an experiment.",
  technique: "Cloning",
  body: `<h2>Q5 Site-Directed Mutagenesis (Quick Workflow)</h2>
<p><strong>Purpose:</strong> Introduce a defined mutation into a plasmid using Q5 amplification, KLD treatment, and transformation.</p>
<p><strong>Kit:</strong> Q5 Site-Directed Mutagenesis Kit</p>
<h3>Setup</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false">
    <label><input type="checkbox"><span></span></label>
    <div><p>Confirm mutagenic primer design (back-to-back orientation) and record primer IDs.</p></div>
  </li>
  <li data-type="taskItem" data-checked="false">
    <label><input type="checkbox"><span></span></label>
    <div><p>Thaw kit reagents on ice and briefly mix/spin down all tubes.</p></div>
  </li>
  <li data-type="taskItem" data-checked="false">
    <label><input type="checkbox"><span></span></label>
    <div><p>Label tubes for PCR, KLD reaction, and transformation workflow.</p></div>
  </li>
</ul>

<h3>PCR Reaction</h3>
<p>Set up reaction mix (example 25 uL total):</p>
<ul>
  <li>Q5 2X Master Mix: 12.5 uL</li>
  <li>Forward primer: 1.25 uL</li>
  <li>Reverse primer: 1.25 uL</li>
  <li>Template plasmid: as required</li>
  <li>Nuclease-free water to 25 uL</li>
</ul>
<p>
  <span data-entry-node="measurement" label="Template DNA" unit="ng" value=""></span>
  <span data-entry-node="measurement" label="Primer concentration" unit="uM" value=""></span>
</p>

<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false">
    <label><input type="checkbox"><span></span></label>
    <div><p>Load PCR in thermocycler and start run.</p><p><span data-entry-node="timer" label="PCR runtime" seconds="5400"></span></p></div>
  </li>
  <li data-type="taskItem" data-checked="false">
    <label><input type="checkbox"><span></span></label>
    <div><p>Record cycler program and reaction ID in notes.</p></div>
  </li>
</ul>

<h3>KLD Treatment</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false">
    <label><input type="checkbox"><span></span></label>
    <div><p>Combine PCR product with KLD buffer and KLD enzyme mix.</p></div>
  </li>
  <li data-type="taskItem" data-checked="false">
    <label><input type="checkbox"><span></span></label>
    <div><p>Incubate at room temperature for 5 minutes.</p><p><span data-entry-node="timer" label="KLD incubation" seconds="300"></span></p></div>
  </li>
</ul>

<h3>Transformation + Recovery</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false">
    <label><input type="checkbox"><span></span></label>
    <div><p>Add KLD mix to competent cells and incubate on ice.</p><p><span data-entry-node="timer" label="Pre-heat-shock ice step" seconds="1800"></span></p></div>
  </li>
  <li data-type="taskItem" data-checked="false">
    <label><input type="checkbox"><span></span></label>
    <div><p>Heat shock, return to ice, then add SOC for outgrowth.</p><p><span data-entry-node="timer" label="SOC outgrowth" seconds="3600"></span></p></div>
  </li>
  <li data-type="taskItem" data-checked="false">
    <label><input type="checkbox"><span></span></label>
    <div><p>Plate on selective agar and incubate overnight at 37 C.</p></div>
  </li>
</ul>

<h3>Next-Day Validation</h3>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false">
    <label><input type="checkbox"><span></span></label>
    <div><p>Count colonies and select candidates for screening.</p>
    <p><span data-entry-node="measurement" label="Colony count" unit="" value=""></span></p></div>
  </li>
  <li data-type="taskItem" data-checked="false">
    <label><input type="checkbox"><span></span></label>
    <div><p>Verify mutation by colony PCR and/or Sanger sequencing.</p></div>
  </li>
  <li data-type="taskItem" data-checked="false">
    <label><input type="checkbox"><span></span></label>
    <div><p>Mark result as PASS only after sequence confirmation of intended edit.</p></div>
  </li>
</ul>

<h3>Capture Fields</h3>
<ul>
  <li>Mutation ID / expected nucleotide or amino acid change</li>
  <li>Primer IDs and annealing assumptions</li>
  <li>Template plasmid and amount</li>
  <li>PCR program and run identifier</li>
  <li>Plate condition and colony count</li>
  <li>Sequencing outcome (PASS/FAIL)</li>
</ul>

<h3>Template Guidance</h3>
<p>This protocol is a permanent template. Clone it for actual experimental runs so the baseline reference stays unchanged.</p>`,
} as const;
