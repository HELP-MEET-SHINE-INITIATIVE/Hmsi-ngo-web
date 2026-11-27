export const SITE_URL = 'https://www.hmsi.org.ng';
export const ORGANIZATION_NAME = 'Help Meet Shine Initiative';

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'NGO',
  name: ORGANIZATION_NAME,
  alternateName: 'HMSI',
  legalName: 'The Incorporated Trustees of HELP-MEET SHINE INITIATIVE',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: 'Help Meet Shine Initiative is a Nigerian nonprofit organization based in Benin City, Edo State, with stated activities in humanitarian assistance, education, empowerment, livelihoods, and community development.',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Benin City',
    addressRegion: 'Edo State',
    addressCountry: 'NG',
  },
  areaServed: { '@type': 'Country', name: 'Nigeria' },
  identifier: [
    { '@type': 'PropertyValue', name: 'CAC/IT/NO', value: '125103' },
    { '@type': 'PropertyValue', name: 'SCUML RN', value: 'SC 121406403' },
  ],
  taxID: '2621241776765',
  hasCredential: {
    '@type': 'EducationalOccupationalCredential',
    name: 'SCUML registration',
    identifier: 'SC 121406403',
    credentialCategory: 'Regulatory registration information published by HMSI',
  },
  sameAs: [
    'https://www.linkedin.com/company/help-meet-shine-initiative/',
    'https://www.facebook.com/@hmsinitiative/',
    'https://www.instagram.com/hmsinitiative/',
  ],
};

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export type Programme = {
  slug: string;
  shortTitle: string;
  title: string;
  description: string;
  keywords: string[];
  audience: string;
  intro: string;
  sections: Array<{ heading: string; paragraphs: string[]; bullets?: string[] }>;
};

export const programmes: Programme[] = [
  {
    slug: 'project-feed-a-home',
    shortTitle: 'Project Feed a Home',
    title: 'Project Feed a Home: practical food support in Nigeria',
    description: 'Learn how HMSI frames Project Feed a Home as a community-centred response to food insecurity, with pathways for beneficiaries, volunteers, donors, and partners in Edo State and Nigeria.',
    keywords: ['Project Feed a Home', 'food insecurity Nigeria', 'food support Benin City', 'Edo State NGO'],
    audience: 'Households seeking information, volunteers, donors, and community partners who want to support responsible food-security work.',
    intro: 'Project Feed a Home is HMSI’s public programme name for practical support related to hunger, household food access, and community relief. The programme is described here in plain language so community members and prospective partners can understand the purpose, the limits of the public information, and how to take a responsible next step.',
    sections: [
      {
        heading: 'Why food security work needs both care and structure',
        paragraphs: [
          'Food insecurity is not only the absence of a meal. It can affect school attendance, household decision-making, health, dignity, and the ability to plan for the next week. A responsible response therefore begins with listening, clear eligibility information, safe distribution arrangements, and respect for people who ask for help.',
          'HMSI describes its humanitarian and community-development work as support delivered with relevant stakeholders. Project Feed a Home should be understood in that context: it is a programme framework for practical support, not a promise that every request can be met or that a single distribution solves a household’s longer-term needs.',
        ],
      },
      {
        heading: 'How the programme can be organised in communities',
        paragraphs: [
          'Community partners can help HMSI understand local priorities, identify safe venues, support inclusive communication, and strengthen referral pathways. Volunteers may contribute time, logistics, documentation, community listening, or professional skills after completing the appropriate HMSI process. Donors can review the organization’s public transparency information and ask how a proposed contribution will be used before giving.',
          'Where a food-support activity is published, HMSI should distinguish what was planned, what took place, what was verified, and what still requires confirmation. That distinction protects community dignity and gives supporters a more reliable picture than inflated reach claims.',
        ],
        bullets: ['Community members: use the public contact and support routes rather than sharing sensitive information in comments.', 'Volunteers: apply through the volunteer route and describe the skills, availability, and location you can responsibly offer.', 'Donors and partners: contact HMSI to discuss restricted or unrestricted support, safeguarding, logistics, and reporting expectations.'],
      },
      {
        heading: 'From immediate relief to stronger household resilience',
        paragraphs: [
          'Food relief can be a first step while families, local groups, and partners consider longer-term options. HMSI’s stated focus includes livelihoods, agriculture, empowerment, and climate resilience. Those areas create a bridge between an immediate response and work that can strengthen people’s ability to access food and income over time.',
          'Read the companion page on climate-resilient community agriculture to see how the same principles can be applied to learning, local production, water awareness, soil care, and community participation. Visit the newsroom and field-stories archive for published updates rather than assuming that a programme description is evidence of a completed activity.',
        ],
      },
    ],
  },
  {
    slug: 'food-security-community-relief-edo',
    shortTitle: 'Food security and community relief',
    title: 'Food security and community relief in Benin City and Edo State',
    description: 'HMSI’s approach to community relief and food-security support in Benin City and Edo State, including safe engagement routes for residents, volunteers, donors, and partners.',
    keywords: ['food security Edo State', 'community relief Benin City', 'humanitarian NGO Edo', 'Nigeria community support'],
    audience: 'Residents, community groups, local institutions, volunteers, donors, and development partners looking for a responsible NGO engagement route in Edo State.',
    intro: 'Help Meet Shine Initiative is based in Benin City, Edo State. This page explains the public programme area of food security and community relief without presenting estimates as confirmed outcomes. It is designed to help people understand how to approach HMSI, what information to prepare, and how relief work connects with safeguarding, accountability, and local partnership.',
    sections: [
      {
        heading: 'A local starting point for practical support',
        paragraphs: [
          'Community relief is most useful when it is grounded in the realities of the people and places involved. In Benin City and across Edo State, a local response may involve community listening, referral information, food or essential-item support, coordination with trusted partners, and follow-up that helps identify needs beyond an immediate distribution.',
          'HMSI’s public materials describe a wider mission that includes humanitarian assistance, poverty alleviation, education, livelihoods, agriculture, WASH, youth empowerment, and climate resilience. Food security therefore sits within a broader community-development picture rather than being treated as a stand-alone charity transaction.',
        ],
      },
      {
        heading: 'What responsible relief looks like',
        paragraphs: [
          'Responsible relief starts with a clear purpose and an honest description of what is available. It avoids photographs or stories that expose people to humiliation, avoids publishing private contact details, and does not use urgency to pressure a donor. It also records basic programme information: the location, the activity date when confirmed, the partners involved, the type of support, the verification status, and the next public update.',
          'For community members, a request for help should be made through an official route. Do not send sensitive identity, health, banking, or children’s information through public social-media comments. HMSI can explain the appropriate channel and any information needed for a specific review.',
        ],
        bullets: ['Residents and community groups can contact HMSI with a concise description of the need, location, timing, and safe point of contact.', 'Volunteers can support outreach, logistics, translation, community listening, or documentation according to an agreed role.', 'Institutions and local partners can discuss referrals, venues, safeguarding, procurement, and reporting before an activity is announced.'],
      },
      {
        heading: 'Linking relief with dignity and accountability',
        paragraphs: [
          'An NGO’s credibility is strengthened when supporters can see how its public claims are controlled. HMSI publishes organizational and compliance information, including CAC/IT/NO 125103, TIN 2621241776765, and SCUML RN SC 121406403. These identifiers do not by themselves prove the outcome of a particular activity, but they give partners a starting point for due diligence alongside the organization’s transparency and safeguarding pages.',
          'For related programme context, read Project Feed a Home, explore climate-resilient community agriculture, or review the published field-story notes. For participation, use the volunteer, partnership, donate, and contact routes linked below.',
        ],
      },
    ],
  },
  {
    slug: 'youth-empowerment-nigeria',
    shortTitle: 'Youth empowerment',
    title: 'Youth empowerment and skills pathways in Nigeria',
    description: 'Explore HMSI’s stated youth empowerment and education focus, with practical guidance for young people, volunteers, mentors, donors, and institutional partners.',
    keywords: ['youth empowerment Nigeria', 'youth skills NGO Edo State', 'education and livelihoods Nigeria', 'youth outreach Benin City'],
    audience: 'Young people, educators, mentors, volunteers, employers, donors, and partners interested in practical youth opportunity in Nigeria.',
    intro: 'Youth empowerment is more than a motivational message. It can include access to information, skills, mentorship, safe participation, livelihood pathways, and the confidence to contribute to community decisions. This page explains the area of work HMSI publicly associates with education, empowerment, livelihoods, and youth outreach.',
    sections: [
      {
        heading: 'What empowerment means in practice',
        paragraphs: [
          'A young person may need different support at different moments: a trusted referral, a learning opportunity, a practical skill, a mentor, a safe place to ask questions, or a connection to a partner. A responsible youth programme does not assume that every participant has the same access, ability, schedule, or goal.',
          'HMSI’s stated activities include education, skills training, empowerment, poverty alleviation, and community development. The public programme direction is therefore broad enough to include learning and livelihoods while remaining honest about what has and has not been announced as a specific funded activity.',
        ],
      },
      {
        heading: 'How young people and mentors can engage',
        paragraphs: [
          'Young people can start by reviewing the available HMSI contact, volunteer, school, and opportunity routes and describing the area in which they want to learn or contribute. Mentors and professional volunteers can offer a defined skill, time commitment, and safeguarding-aware approach rather than an open-ended promise. Organizations with training, internships, apprenticeships, or entry-level opportunities can contact HMSI to discuss fit and responsible referral.',
          'Any youth-facing activity should use age-appropriate communication, consent and safeguarding controls, clear expectations, and a process for raising concerns. The aim is to expand agency without exposing young people to avoidable risk or making promises that cannot be kept.',
        ],
        bullets: ['Young people: tell HMSI what you are trying to learn or solve and what kind of opportunity you can realistically access.', 'Mentors: offer a specific topic, format, availability, and relevant experience through the volunteer or partnership route.', 'Partners: discuss safeguarding, inclusion, accessibility, referrals, and how participation will be documented before launch.'],
      },
      {
        heading: 'Connecting youth opportunity to community resilience',
        paragraphs: [
          'Youth participation can strengthen other HMSI programme areas, including community agriculture, food security, education, peacebuilding, digital communication, and local volunteering. When young people help document a community issue, support a learning session, or contribute a practical idea, they are participants in community development rather than passive recipients of aid.',
          'Read the climate-resilient agriculture page for an example of how skills and local knowledge can connect to food and livelihood conversations. Visit /volunteer to submit an application or /partnerships to discuss a structured collaboration.',
        ],
      },
    ],
  },
  {
    slug: 'climate-resilient-community-agriculture',
    shortTitle: 'Climate-resilient community agriculture',
    title: 'Climate-resilient community agriculture and local livelihoods',
    description: 'Understand HMSI’s stated climate-resilience and agriculture focus, and how community groups, farmers, volunteers, donors, and technical partners can explore responsible collaboration.',
    keywords: ['climate-resilient agriculture Nigeria', 'community agriculture Edo State', 'livelihoods and food security Nigeria', 'ecosystem-based adaptation NGO'],
    audience: 'Community groups, farmers, youth, agricultural practitioners, volunteers, donors, and technical partners exploring locally grounded resilience work.',
    intro: 'Climate-resilient community agriculture connects food, livelihoods, land, water, skills, and local decision-making. HMSI identifies agriculture, livelihoods, food security, and climate resilience among its stated areas of interest. This page sets out a practical and evidence-aware way to understand that work while avoiding claims about a farm, harvest, or beneficiary result that has not been publicly verified.',
    sections: [
      {
        heading: 'Why resilience belongs in a food-security strategy',
        paragraphs: [
          'Immediate food support can help a household through a difficult period, but communities also need options that improve their ability to plan, produce, earn, and adapt. Climate-resilient agriculture may involve attention to soil, water, crops, timing, local knowledge, diversified livelihoods, and risk reduction. The right combination depends on the community and should be developed with people who understand local conditions.',
          'For HMSI, this programme area can provide a bridge between Project Feed a Home and longer-term community development. The bridge is not automatic: it requires consultation, technical input, safeguarding, realistic budgets, and a way to report what was actually delivered.',
        ],
      },
      {
        heading: 'A community-led way to explore the work',
        paragraphs: [
          'Community groups can begin by describing the local challenge, the people already contributing, the resources available, and the change they would like to test. Agricultural or environmental partners can help review feasibility, seasonal considerations, inclusion, and monitoring. Volunteers may contribute research, communications, training support, or field logistics when a defined role and appropriate supervision are in place.',
          'Donors and funders should ask for a clear activity plan, procurement approach, safeguarding arrangements, expected learning, and reporting schedule. It is better to publish a modest, verifiable update than to announce a large impact claim before the work has taken place.',
        ],
        bullets: ['Community groups: share local priorities and existing knowledge before proposing a solution.', 'Technical partners: help HMSI assess feasibility, climate risk, accessibility, and learning indicators.', 'Supporters: ask how funds will be allocated and how the programme will report progress and uncertainty.'],
      },
      {
        heading: 'From activity to learning',
        paragraphs: [
          'A useful field update can explain what was attempted, where and when it happened, who participated in a non-identifying way, what was observed, and what will change next. That kind of record helps communities and partners learn together. It also gives search visitors a more trustworthy account of NGO work in Nigeria than generic language about transformation.',
          'Review HMSI’s transparency page, volunteer route, partnership information, and the food-security field notes for related context. To discuss a technical or community partnership, use the public contact route rather than publishing private details on an open page.',
        ],
      },
    ],
  },
];

export type FieldStory = {
  slug: string;
  title: string;
  dek: string;
  category: string;
  publishedLabel: string;
  programmeSlug: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
};

export const fieldStories: FieldStory[] = [
  {
    slug: 'food-insecurity-edo-project-feed-a-home',
    title: 'Addressing food insecurity in Edo State: the work behind Project Feed a Home',
    dek: 'An HMSI field note on how immediate food support can be planned with dignity, community listening, and a path toward longer-term food security.',
    category: 'Food security',
    publishedLabel: 'Programme field note',
    programmeSlug: 'project-feed-a-home',
    sections: [
      { heading: 'Starting with the household experience', paragraphs: ['Food insecurity is often described with a statistic, but a community response begins with the household experience: whether food is available, whether a family can make it to the next market day, whether children can focus on school, and whether a person can ask for help without losing dignity. Project Feed a Home gives HMSI a public way to talk about practical food support while keeping the person, not the publicity, at the centre.', 'This note is an editorial explanation of the programme approach. It does not claim a particular distribution count or beneficiary total. HMSI should use activity-specific updates for those facts when they have been verified and approved for publication.'] },
      { heading: 'Relief is strongest when it is organised', paragraphs: ['A food-support activity needs more than good intentions. It needs a purpose, a safe venue or delivery arrangement, clear communication, responsible procurement, and a way to receive feedback. Community partners can help identify local priorities and reduce the chance that support is designed without listening. Volunteers can help with logistics, translation, registration, or documentation under an agreed role.', 'Donors and partners also need a clear account of what their support is intended to do. A responsible update distinguishes planned activity from completed activity and describes uncertainty instead of hiding it. That discipline protects both the community and the credibility of the organization.'] },
      { heading: 'The longer conversation about food security', paragraphs: ['Immediate relief can create breathing room, but food security also connects to livelihoods, agriculture, youth skills, water, climate risk, and local markets. HMSI’s wider stated programme areas create room for that conversation. The next step may be a referral, a community agriculture partnership, a volunteer contribution, or a carefully scoped project proposal rather than another one-off promise.', 'Read the Project Feed a Home programme page, explore the climate-resilient agriculture route, and contact HMSI if you can contribute a defined skill, resource, or partnership.'] },
    ],
  },
  {
    slug: 'immediate-relief-to-climate-resilient-farms',
    title: 'From immediate relief to sustainability: building climate-resilient community farms',
    dek: 'A practical HMSI field note on connecting humanitarian support with local agriculture, learning, livelihoods, and climate adaptation.',
    category: 'Climate resilience',
    publishedLabel: 'Programme field note',
    programmeSlug: 'climate-resilient-community-agriculture',
    sections: [
      { heading: 'Why the transition needs care', paragraphs: ['The language of “relief to resilience” can sound simple, but the transition is not a ladder that every household climbs in the same way. A community may need food support today, a livelihood referral tomorrow, and technical help to manage agricultural risk over a longer period. The responsible starting point is to ask what people already know, what resources are available, and what risks could make a proposed intervention fail.', 'HMSI identifies agriculture, livelihoods, food security, and climate resilience among its stated areas of interest. This field note explains a direction for work, not a claim that a specific farm or harvest has already delivered a measured result.'] },
      { heading: 'What community agriculture can include', paragraphs: ['A community-led agriculture project may include soil and water conversations, seasonal planning, crop or livelihood diversification, skills exchange, youth participation, and links to local markets. Technical partners can help assess feasibility and climate exposure. Community groups can identify what is practical and what would create an unnecessary burden. Volunteers can contribute research or coordination when their role is defined and supervised.', 'The strongest project plan also says what will be monitored. That might include activities completed, participation, learning, operational challenges, and decisions for the next cycle. It should not turn an estimate into a promise or a short-term activity into a claim of permanent change.'] },
      { heading: 'How supporters can contribute responsibly', paragraphs: ['Partners can help with technical review, training, tools, community facilitation, or learning. Donors can ask for the activity plan, procurement controls, safeguarding arrangements, and reporting approach before committing. Volunteers can offer practical skills through HMSI’s volunteer route. Community members can share local knowledge and raise concerns through a safe public contact channel.', 'This is how a food-security conversation can grow into a resilience conversation without leaving immediate needs behind. Read the related programme page and HMSI transparency information before proposing a collaboration.'] },
    ],
  },
  {
    slug: 'governance-and-scuml-compliance-nonprofits-nigeria',
    title: 'Why governance and SCUML compliance matter for nonprofits in Nigeria',
    dek: 'An HMSI field note on public accountability, nonprofit due diligence, and why registration information should sit alongside evidence of programme work.',
    category: 'Governance',
    publishedLabel: 'Accountability field note',
    programmeSlug: 'food-security-community-relief-edo',
    sections: [
      { heading: 'Trust is built through more than a logo', paragraphs: ['People who support an NGO need to know who the organization is, what it says it does, how it handles information, and where to ask questions. Governance information is not a substitute for programme evidence, but it is part of the foundation that lets a community member, donor, or partner begin due diligence.', 'HMSI publishes its public identity as Help Meet Shine Initiative, its base in Benin City, Edo State, and its stated areas of work. The organization also publishes CAC/IT/NO 125103, TIN 2621241776765, and SCUML RN SC 121406403. These are identifiers to support verification conversations; they should not be presented as proof of a particular impact figure.'] },
      { heading: 'What responsible public reporting looks like', paragraphs: ['A credible nonprofit update makes the status of information clear. It can say whether an activity is planned, approved, completed, reported, or still under review. It avoids publishing private phone numbers, email addresses, health details, or identifying information about children. It explains how people can raise a concern and links to privacy, safeguarding, and transparency information.', 'For supporters, good questions include: What is the purpose of this activity? Who approved it? What will be reported? How are funds or in-kind contributions controlled? What is the next update? Questions like these strengthen the relationship between an NGO and the communities it serves.'] },
      { heading: 'A practical invitation to due diligence', paragraphs: ['HMSI welcomes responsible engagement through its public contact, partnerships, volunteer, and transparency routes. Partners can request the information needed for a specific collaboration without asking the website to expose personal data. Community members can ask for clarification in plain language. Donors can review an approved cause and ask questions before giving.', 'Read the About and Transparency pages alongside the programme pages. A healthy public record connects legal identity, safeguarding, privacy, programme purpose, and honest reporting.'] },
    ],
  },
  {
    slug: 'grassroots-volunteerism-hmsi-model',
    title: 'Empowering communities through grassroots volunteerism: the HMSI model',
    dek: 'A field note on how local knowledge, practical skills, safeguarding, and clear roles can make volunteer participation more useful and respectful.',
    category: 'Volunteerism',
    publishedLabel: 'Community participation field note',
    programmeSlug: 'youth-empowerment-nigeria',
    sections: [
      { heading: 'Volunteering is a relationship, not a photo opportunity', paragraphs: ['A volunteer brings more than time. They bring local knowledge, a professional skill, lived experience, or the willingness to do careful work that may not be visible in a public photograph. Grassroots volunteerism is strongest when communities help shape the work and when volunteers understand that dignity, consent, safeguarding, and reliability come before recognition.', 'HMSI’s public volunteer route is the appropriate starting point for people who want to contribute. The website should not treat a general expression of interest as approval to represent the organization or access private beneficiary information.'] },
      { heading: 'Clear roles make participation safer', paragraphs: ['A useful volunteer role has a defined purpose, time commitment, supervisor, boundaries, and reporting route. It might involve community listening, event logistics, translation, communications, training support, agriculture research, or administrative help. A role involving children, personal data, money, or field access requires additional controls and should never be improvised.', 'Volunteers can also help improve the quality of public reporting by recording what happened, where and when it happened, who was involved in a non-identifying way, and what remains uncertain. That creates a more trustworthy record for communities and supporters.'] },
      { heading: 'How to take the next step', paragraphs: ['If you want to volunteer, describe the skills, location, availability, and type of work you can responsibly offer. If you represent a school, company, community group, or technical organization, use the partnerships route to discuss a structured collaboration. If you need support, use the Get Help route rather than presenting a private case in a public comment.', 'Read the youth empowerment and food-security programme pages to see where volunteer skills can connect with broader community priorities. HMSI’s goal should be practical participation that strengthens communities, not activity for its own sake.'] },
    ],
  },
];

export const programmeBySlug = Object.fromEntries(programmes.map((programme) => [programme.slug, programme])) as Record<string, Programme>;
export const fieldStoryBySlug = Object.fromEntries(fieldStories.map((story) => [story.slug, story])) as Record<string, FieldStory>;
