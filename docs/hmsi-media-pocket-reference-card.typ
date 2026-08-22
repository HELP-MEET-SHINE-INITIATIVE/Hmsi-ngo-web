#set page(
  paper: "a4",
  flipped: false,
  margin: (top: 1.2cm, bottom: 1.2cm, left: 1.2cm, right: 1.2cm),
  header: none,
  footer: [
    #line(length: 100%, stroke: 0.5pt + rgb("#d9d6ce"))
    #v(1mm)
    #grid(
      columns: (1fr, 1fr),
      align(left)[#text(size: 7.5pt, fill: rgb("#66716a"))[*Help Meet Shine Initiative (HMSI)* · Emergency & Media Routing: *contact\@hmsi.org.ng*]],
      align(right)[#text(size: 7.5pt, fill: rgb("#66716a"))[Official Internal Pocket Card · August 2026 Edition · Page 1 of 1]]
    )
  ]
)

#set text(
  font: ("Liberation Sans", "DejaVu Sans"),
  size: 8.5pt,
  fill: rgb("#17221e"),
  spacing: 120%
)

#set par(leading: 0.55em, justify: false)

// --- Header Block ---
#rect(
  width: 100%,
  fill: rgb("#102019"),
  inset: (x: 14pt, y: 10pt),
  radius: 4pt,
  stroke: none,
  [
    #grid(
      columns: (1fr, auto),
      gutter: 10pt,
      align: (left + horizon, right + horizon),
      [
        #text(size: 13pt, weight: "bold", fill: rgb("#ffffff"))[HMSI SENSITIVE MEDIA INQUIRY POCKET CARD] \
        #v(1.5mm)
        #text(size: 8pt, weight: "medium", fill: rgb("#e1ad45"))[QUICK-ACTION OPERATIONAL GUIDE FOR ALL STAFF, WORKERS & VOLUNTEERS]
      ],
      [
        #rect(
          fill: rgb("#e1ad45"),
          inset: (x: 8pt, y: 5pt),
          radius: 3pt,
          [
            #text(size: 7.5pt, weight: "bold", fill: rgb("#17221e"))[PROTECT PEOPLE FIRST]
          ]
        )
      ]
    )
  ]
)

#v(2.5mm)

// --- The Golden Rule & 5 Universal Rules ---
#grid(
  columns: (1fr, 1.2fr),
  gutter: 10pt,
  [
    #rect(
      width: 100%,
      fill: rgb("#f6f4ef"),
      stroke: 1pt + rgb("#d9d6ce"),
      inset: 8pt,
      radius: 3pt,
      [
        #text(weight: "bold", size: 8.5pt, fill: rgb("#b56b3b"))[THE CORE PRINCIPLE] \
        #v(1mm)
        #text(size: 8pt, style: "italic")[
          "Be helpful without guessing, protect people before reputation, and refer all on-record questions to the designated spokesperson."
        ]
        #v(1.5mm)
        #text(size: 7.5pt, fill: rgb("#1e5b49"), weight: "bold")[Media inquiries are standard accountability, not hostility.]
      ]
    )
  ],
  [
    #rect(
      width: 100%,
      fill: rgb("#ffffff"),
      stroke: 1pt + rgb("#d9d6ce"),
      inset: 8pt,
      radius: 3pt,
      [
        #text(weight: "bold", size: 8.5pt, fill: rgb("#17221e"))[5 UNIVERSAL RULES]
        #v(1mm)
        #grid(
          columns: (1fr, 1fr),
          gutter: 4pt,
          [#text(size: 7.5pt)[*1. Stop & Identify:* Name & outlet.]],
          [#text(size: 7.5pt)[*2. No Guessing:* Never improvise.]],
          [#text(size: 7.5pt)[*3. Protect Data:* Zero child disclosure.]],
          [#text(size: 7.5pt)[*4. Route Correctly:* One official voice.]],
          [#text(size: 7.5pt)[*5. Save Records:* Preserve evidence.]],
          []
        )
      ]
    )
  ]
)

#v(2mm)

// --- Section 1: The 5-Minute Safe Response Protocol ---
#text(weight: "bold", size: 9.5pt, fill: rgb("#17221e"))[1. THE 5-MINUTE SAFE RESPONSE PROTOCOL]

#v(1mm)

#grid(
  columns: (1fr, 1fr, 1fr, 1fr),
  gutter: 6pt,
  [
    #rect(
      width: 100%,
      height: 68pt,
      fill: rgb("#ffffff"),
      stroke: 1pt + rgb("#cbd2ca"),
      inset: 6pt,
      radius: 3pt,
      [
        #text(weight: "bold", size: 7.5pt, fill: rgb("#1e5b49"))[MIN 1: PAUSE & GREET] \
        #v(0.5mm)
        #text(size: 7pt, fill: rgb("#55625a"))[Stay calm & polite. Do not offer immediate off-the-cuff statements or defensive comments.]
      ]
    )
  ],
  [
    #rect(
      width: 100%,
      height: 68pt,
      fill: rgb("#ffffff"),
      stroke: 1pt + rgb("#cbd2ca"),
      inset: 6pt,
      radius: 3pt,
      [
        #text(weight: "bold", size: 7.5pt, fill: rgb("#1e5b49"))[MIN 2: CAPTURE FACTS] \
        #v(0.5mm)
        #text(size: 7pt, fill: rgb("#55625a"))[Note reporter name, outlet, topic, exact questions, format, and publication deadline.]
      ]
    )
  ],
  [
    #rect(
      width: 100%,
      height: 68pt,
      fill: rgb("#ffffff"),
      stroke: 1pt + rgb("#cbd2ca"),
      inset: 6pt,
      radius: 3pt,
      [
        #text(weight: "bold", size: 7.5pt, fill: rgb("#1e5b49"))[MIN 3: HOLDING LINE] \
        #v(0.5mm)
        #text(size: 7pt, fill: rgb("#55625a"))[Deliver approved holding script. Provide official email contact\@hmsi.org.ng.]
      ]
    )
  ],
  [
    #rect(
      width: 100%,
      height: 68pt,
      fill: rgb("#ffffff"),
      stroke: 1pt + rgb("#cbd2ca"),
      inset: 6pt,
      radius: 3pt,
      [
        #text(weight: "bold", size: 7.5pt, fill: rgb("#1e5b49"))[MIN 4–5: ROUTE & SAVE] \
        #v(0.5mm)
        #text(size: 7pt, fill: rgb("#55625a"))[Forward inquiry to Communications Lead. Save message screenshots and timestamps.]
      ]
    )
  ]
)

#v(1.5mm)

// --- Verbal Holding Script Box ---
#rect(
  width: 100%,
  fill: rgb("#e9f0e9"),
  stroke: 1pt + rgb("#1e5b49"),
  inset: (x: 8pt, y: 6pt),
  radius: 3pt,
  [
    #grid(
      columns: (auto, 1fr),
      gutter: 8pt,
      [#text(weight: "bold", size: 8pt, fill: rgb("#1e5b49"))[EXACT PHONE / VERBAL SCRIPT:]],
      [
        #text(size: 7.5pt, style: "italic", fill: rgb("#17221e"))[
          "Thank you for contacting HMSI. I am not authorized to give on-record comments, but I will refer your inquiry to our designated spokesperson for verified information. Please send your deadline and specific questions to contact\@hmsi.org.ng."
        ]
      ]
    )
  ]
)

#v(2.5mm)

// --- Section 2: RAG Triage & Escalation Thresholds ---
#text(weight: "bold", size: 9.5pt, fill: rgb("#17221e"))[2. RAG TRIAGE & ESCALATION THRESHOLDS]

#v(1mm)

#table(
  columns: (1.1fr, 2.3fr, 1.3fr, 1.3fr),
  stroke: 0.5pt + rgb("#cbd2ca"),
  fill: (col, row) => if row == 0 { rgb("#17221e") } else if row == 1 { rgb("#f4faf4") } else if row == 2 { rgb("#fffbf2") } else { rgb("#fff5f5") },
  inset: (x: 6pt, y: 5pt),
  align: (col, row) => if row == 0 { center + horizon } else { left + horizon },
  
  // Header
  [#text(weight: "bold", size: 7.5pt, fill: white)[Severity Level]],
  [#text(weight: "bold", size: 7.5pt, fill: white)[Trigger Criteria & Examples]],
  [#text(weight: "bold", size: 7.5pt, fill: white)[Response Target]],
  [#text(weight: "bold", size: 7.5pt, fill: white)[Incident Owner]],

  // Green
  [
    #rect(fill: rgb("#2e7d32"), inset: 2pt, radius: 2pt)[#text(weight: "bold", size: 7pt, fill: white)[GREEN (Low)]]
  ],
  [#text(size: 7pt)[Routine program questions, neutral directory listings, event invitations, public website clarifications.]],
  [#text(size: 7pt)[1–2 business days (Standard response)]],
  [#text(size: 7pt)[Communications Team / Spokesperson]],

  // Amber
  [
    #rect(fill: rgb("#e65100"), inset: 2pt, radius: 2pt)[#text(weight: "bold", size: 7pt, fill: white)[AMBER (Medium)]]
  ],
  [#text(size: 7pt)[Disputed metrics/figures, donor/partner concerns, material news criticism, tight deadlines (< 24 hrs).]],
  [#text(size: 7pt)[Triage < 4 hours; Holding line while verifying]],
  [#text(size: 7pt)[Spokesperson & Program Lead]],

  // Red
  [
    #rect(fill: rgb("#c62828"), inset: 2pt, radius: 2pt)[#text(weight: "bold", size: 7pt, fill: white)[RED (High / Crisis)]]
  ],
  [#text(size: 7pt)[*Safeguarding / child abuse claims*, fraud / fund misuse, data breach, extortion/scam, legal/regulator demand.]],
  [#text(size: 7pt)[*Immediate escalation*; Zero public debate; Safety/legal priority]],
  [#text(size: 7pt)[*Trustees, President & Legal Lead*]]
)

#v(2mm)

// --- Section 3: Critical Safeguarding & Data Rules ---
#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  [
    #rect(
      width: 100%,
      fill: rgb("#ffffff"),
      stroke: 1pt + rgb("#d9d6ce"),
      inset: 7pt,
      radius: 3pt,
      [
        #text(weight: "bold", size: 8pt, fill: rgb("#c62828"))[WHAT NEVER TO DISCLOSE (STRICTLY PROHIBITED)] \
        #v(1mm)
        #text(size: 7pt, fill: rgb("#55625a"))[
          - *No Child Data:* Never disclose minor names, schools, or home locations. \
          - *No Medical / Case Files:* Medical records remain strictly confidential. \
          - *No Personal Accounts:* Never argue or defend HMSI on personal social media. \
          - *No Improvising:* Never guess metrics (e.g. "Food for 30 families is a target").
        ]
      ]
    )
  ],
  [
    #rect(
      width: 100%,
      fill: rgb("#ffffff"),
      stroke: 1pt + rgb("#d9d6ce"),
      inset: 7pt,
      radius: 3pt,
      [
        #text(weight: "bold", size: 8pt, fill: rgb("#1e5b49"))[DATA & ESCALATION CONTACTS] \
        #v(1mm)
        #text(size: 7pt, fill: rgb("#55625a"))[
          - *Official Media Inbox:* `contact@hmsi.org.ng` \
          - *Safeguarding & Protection:* Mark email subject `[SAFEGUARDING]` \
          - *Data Privacy Concerns:* Mark email subject `[PRIVACY]` \
          - *Immediate Physical Danger:* Call local emergency services immediately!
        ]
      ]
    )
  ]
)
