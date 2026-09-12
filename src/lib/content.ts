export const NAV = [
  { to: "/", label: "The movement" },
  { to: "/mission", label: "Live on Mission" },
  { to: "/pantry", label: "Vidalia pantry" },
  { to: "/organizations", label: "For organizations" },
  { to: "/bible", label: "Bible" },
  { to: "/give", label: "Give" },
] as const;

export const SCRIPTURE = {
  matthew: {
    ref: "Matthew 5:16",
    text: "Let your light shine before others, so that they may see your good works and give glory to your Father who is in heaven.",
  },
  john: {
    ref: "John 17:21",
    text: "That they may all be one, just as you, Father, are in me, and I in you, that they also may be in us, so that the world may believe that you have sent me.",
  },
  romans: {
    ref: "Romans 12:5",
    text: "So we, though many, are one body in Christ, and individually members one of another.",
  },
  galatians: {
    ref: "Galatians 5:13",
    text: "Through love serve one another.",
  },
} as const;

export const PILLARS = [
  {
    kicker: "01",
    title: "United",
    lead: "Under the authority of God.",
    body: "Jesus did not ask us to be loosely affiliated. He prayed that we would be one — so the world would believe. Churches, businesses, charities, governments, and households are not competing silos. We are one body, with one purpose, for the Kingdom of God.",
  },
  {
    kicker: "02",
    title: "Loving",
    lead: "Grace. Forgiveness. Reconciliation.",
    body: "Unity without love is a slogan. Love means we understand one another’s conditions and struggles. We forgive. We reconcile. We refuse contempt. We err on the side of mercy — because that is how we were treated.",
  },
  {
    kicker: "03",
    title: "Active",
    lead: "Unity is worked out in action.",
    body: "We are not united because we sit in the same building on Sunday. The people of God’s church do things that change the world around them. Good works, seen. Neighbors, fed. Wounds, tended. That is how people praise God.",
  },
] as const;

export const BENEFITS = [
  {
    title: "Financially",
    body: "Kingdom organizations should not pay retail for what they can buy together. A united buying program — the way Georgia compiles bids for its offices — puts toner, supplies, and services within reach of the smallest church and the leanest charity. Shared tools replace duplicate software bills. Grocery donors divert dumpster costs and may qualify for charitable deductions on donated inventory.",
  },
  {
    title: "Socially",
    body: "You stop working as an independent silo. You stand with pastors, business owners, charities, and civic leaders who have made the same statement of intent. The seal is a public witness: we choose to be unified, and we intend to fulfill the biblical mandate. Your community sees the church doing, not only gathering.",
  },
  {
    title: "Individually",
    body: "Obedience is for our blessing. People who live on mission recover purpose. They practice grace instead of nursing offense. They watch God be praised because of work they actually did. That is a better life than calling yourself united and going home.",
  },
] as const;

export const GIVE_WAYS = [
  {
    id: "time" as const,
    title: "Time",
    body: "Pack boxes. Drive a route. Sit with someone. Offer the skill you already have — bookkeeping, carpentry, counseling, cooking, a truck. Live on Mission is built for ordinary hours, not a second career.",
  },
  {
    id: "money" as const,
    title: "Money",
    body: "Gifts fund the Vidalia pantry, the tools churches use, and the work of keeping this movement honest and moving. A little, given together, feeds people this week.",
  },
  {
    id: "goods" as const,
    title: "Goods",
    body: "Furniture a family can use. Clothing. Household goods. Tell us what it is, what vehicle to bring, and how many people to lift it — we will come get it.",
  },
] as const;

export const ORG_TYPES = [
  {
    title: "Churches",
    body: "Keep your denomination. Keep your associations. Take the seal as a statement that you will be one body with the rest of the church in your town — and then put your people on mission, not only in a pew.",
  },
  {
    title: "Businesses",
    body: "Christian-led companies are not secular machines with a verse on the wall. Operate by God’s principles. Do for others what you want done for you. Join the buying fellowship. Donate surplus. Let the seal tell your people and your customers what you intend.",
  },
  {
    title: "Charities",
    body: "You already serve. You should not have to serve alone, on an island of your own software, your own suppliers, and your own exhaustion. Share the desk. Share the load. Let the pantry, the thrift, the mentoring work belong to the whole body.",
  },
  {
    title: "Governments & civic work",
    body: "Where Christian men and women hold public trust, the same instruction holds: be united, be just, do good that can be seen. We offer tools, a fellowship, and a way to put surplus and service where neighbors actually live.",
  },
] as const;

export const APPS = {
  hope: [
    {
      name: "Live On Mission",
      href: "https://liveonmission.unitedundergod.org",
      blurb: "See the need. Do the thing. Tell the story. The ordinary path into a purposeful life.",
    },
    {
      name: "Spark of Hope",
      href: "https://spark.unitedundergod.org",
      blurb: "Living testimony — after you do the thing, tell the story so the next person does not start from zero.",
    },
    {
      name: "Kindred Connections",
      href: "https://kindred.unitedundergod.org",
      blurb: "Friendships and growth groups around purpose.",
    },
    {
      name: "Aligned Souls",
      href: "https://alignedsouls.unitedundergod.org",
      blurb: "Dating partners who help you become who God designed you to be.",
    },
    {
      name: "Kids Need Dads",
      href: "https://dads.unitedundergod.org",
      blurb: "Support, mentorship, and restoration for fathers.",
    },
    {
      name: "ChildFirst Solutions",
      href: "https://childfirst.unitedundergod.org",
      blurb: "Co-parenting support and child-focused tools for families in conflict.",
    },
    {
      name: "Best Life",
      href: "https://bestlife.unitedundergod.org",
      blurb: "Growth pathways — relational, financial, spiritual, mental, emotional, physical.",
    },
    {
      name: "Speak to Me",
      href: "https://speak-to-me.unitedundergod.org",
      blurb: "Simple personal Bible reading, one day at a time.",
    },
    {
      name: "Understanding the Bible",
      href: "/bible",
      blurb: "Short answers to real questions — verses, not a system for managing sin.",
    },
    {
      name: "Presence",
      href: "https://presence.unitedundergod.org",
      blurb: "Simple ways to host and enjoy the presence of others.",
    },
    {
      name: "Immerse",
      href: "https://immerse.unitedundergod.org",
      blurb: "Nature immersion camping — public land, simple trip planning.",
    },
    {
      name: "Barefoot Coalition",
      href: "https://barefoot.unitedundergod.org",
      blurb: "Natural living and grounding — rooted in nature, united in purpose.",
    },
    {
      name: "Dreamstand",
      href: "https://dreamstand.unitedundergod.org",
      blurb: "Kids turn ideas into little businesses — courage, money, and a flop that is only a lesson.",
    },
    {
      name: "Sandlot",
      href: "https://swaparound.vercel.app",
      blurb: "Kids meetups, toy exchange, and supervised playdates — free, parent-run.",
    },
  ],
  church: [
    {
      name: "ChurchConnect",
      href: "https://churchconnect.unitedundergod.org",
      blurb: "Communication, events, groups, volunteers, giving, and discipleship in one system. Enter once.",
    },
    {
      name: "Plenty",
      href: "https://plenty.unitedundergod.org",
      blurb: "The Vidalia food pantry — get food, volunteer, or donate. Grocers can give here or through this site.",
    },
    {
      name: "Vidalia / Toombs Pastors Circle",
      href: "https://churchconnect.unitedundergod.org/association",
      blurb: "Local pastors, standing together — not competing for a town that belongs to God.",
    },
    {
      name: "Neighborly",
      href: "https://neighborly.unitedundergod.org",
      blurb: "Neighbors helping neighbors, locally.",
    },
    {
      name: "Pulse",
      href: "https://pulse.unitedundergod.org",
      blurb: "Two-way alignment signals so issues surface before they become crises.",
    },
    {
      name: "Operate",
      href: "https://operate.unitedundergod.org",
      blurb: "The desk for thrift, clothing, and furniture — intake, what’s available, pickup or a delivery box.",
    },
  ],
  practical: [
    {
      name: "EasyPeazy",
      href: "https://easypeazy.unitedundergod.org",
      blurb: "Domains, hosting, and websites without the tech overwhelm.",
    },
    {
      name: "Porchlight",
      href: "https://porchlight.unitedundergod.org",
      blurb: "Off-market houses in Vidalia and Toombs — buy, repair, live, rent, or sell.",
    },
    {
      name: "Toner Connect",
      href: "https://tonerconnect.unitedundergod.org",
      blurb: "Free printer monitoring and a buying group for supplies.",
    },
    {
      name: "Toner Management",
      href: "https://toner.management",
      blurb: "We watch your printers and get toner to the right desk before anyone runs out.",
    },
    {
      name: "Ideas",
      href: "https://ideas.unitedundergod.org",
      blurb: "Capture an idea the moment it arrives and forge it into content.",
    },
    {
      name: "Laser Engrave Market",
      href: "https://laser.unitedundergod.org",
      blurb: "Custom engraving for gifts, products, and business branding.",
    },
    {
      name: "App Engine",
      href: "https://appengine.unitedundergod.org",
      blurb: "Describe a problem. Get a working app built for it.",
    },
  ],
} as const;

export const SEAL_STATEMENT = [
  "Our organization chooses to be united under God — one body and one purpose for God’s Kingdom.",
  "We choose to operate by God’s principles, doing for others what we want them to do for us.",
  "We choose to love one another with grace, forgiveness, and reconciliation — and to work that love out in action the world can see.",
] as const;

export const LBS_PER_MEAL = 1.2;

export const LEGAL = {
  name: "United Under God, Inc.",
  status: "501(c)(3) nonprofit",
  ein: "81-3554390",
} as const;

export const PLENTY_URL = "https://plenty.unitedundergod.org";
export const PLENTY_DONATE = "https://plenty.unitedundergod.org/donate";
export const SPARK_URL = "https://spark.unitedundergod.org";
export const MISSION_APP = "https://liveonmission.unitedundergod.org";
export const MISSION_PUBLIC = "https://live-on-mission.com";
export const CHURCHCONNECT_URL = "https://churchconnect.unitedundergod.org";

export const DONOR_URL = "https://unitedundergod.org/food-donors";

export const DONOR_BENEFITS = [
  {
    kicker: "01",
    title: "Twice the write-off",
    lead: "Throw it away: deduct cost. Donate it: you may deduct twice as much.",
    body: "Federal law (IRC §170(e)(3)) lets a business deduct the cost of apparently wholesome food plus half the profit it would have made, capped at twice the cost. Example: you paid $200 and would have sold it for $600. Dumpster write-off ≈ $200. Donate write-off ≈ $400. Caps apply — generally 15% of income from the business. Ask your accountant. This is not tax advice.",
  },
  {
    kicker: "02",
    title: "Kindness comes back as sales",
    lead: "People who feel a store’s kindness reciprocate.",
    body: "They walk your aisles and often spend leftover money on other items at your store — milk, meat, soap, a birthday cake — not the one down the road. Research on pantry density finds no significant drop in grocer revenue when a pantry is nearby (Kopp & Chenarides). You are feeding a customer who still needs a store.",
  },
  {
    kicker: "03",
    title: "The dumpster charges you",
    lead: "Disposal is a fee. Donation is often cheaper.",
    body: "Pull aging food, donate it, restock. Stores that do this have been shown to earn higher markups — one study found about a third higher after controls (Lowrey et al.). You also stop paying to haul what you cannot sell.",
  },
  {
    kicker: "04",
    title: "You are covered",
    lead: "Two shields, then a waiver.",
    body: "The Bill Emerson Good Samaritan Food Donation Act (42 U.S.C. § 1791) and Georgia’s own statute (O.C.G.A. § 51-1-31) protect good-faith donors of apparently wholesome food to a nonprofit. Recipients at this pantry also sign a waiver before they take food. The exception is gross negligence or intentional misconduct — not ordinary donation.",
  },
] as const;

export const DONOR_PATHS: {
  id: "food" | "goods" | "org";
  title: string;
  who: string;
  desk: string;
  deskHref?: string;
  deskNote: string;
  blurb: string;
}[] = [
  {
    id: "food" as const,
    title: "Unsold food",
    who: "Grocery stores, restaurants, farms, distributors",
    desk: "Plenty",
    deskNote: "Pantry operations — your gift is received, tracked, and served. You see the meals.",
    blurb: "Tell us the store, the surplus, and a pickup window. We add you to Plenty and come get the food.",
  },
  {
    id: "goods" as const,
    title: "Furniture, clothes, household",
    who: "A household or a business with goods that can bless a neighbor",
    desk: "Operate",
    deskHref: "https://operate.unitedundergod.org",
    deskNote: "The desk for thrift, clothing, and furniture — intake, pickup, or a delivery box.",
    blurb: "Tell us what you have and whether we should pick it up. Operate is where that gift is managed.",
  },
  {
    id: "org" as const,
    title: "A thrift, closet, or charity",
    who: "Shops and ministries that give or receive goods",
    desk: "Operate",
    deskHref: "https://operate.unitedundergod.org",
    deskNote: "If you run a thrift or a clothing closet, this is your desk — not a second set of books.",
    blurb: "Join Operate if you receive goods. Offer surplus if you have it. One desk, not a silo.",
  },
] as const;

export const HAPPENINGS = [
  {
    title: "Standing up the Vidalia pantry",
    when: "Saturdays, as we build it",
    need: "Packers, shelf-builders, a truck, a cool head",
    desk: "ChurchConnect",
    kind: "help" as const,
  },
  {
    title: "Grocery surplus route",
    when: "Weekday closing, by arrangement",
    need: "A driver who can lift and keep food cold",
    desk: "Plenty",
    kind: "help" as const,
  },
  {
    title: "Live on Mission — a first step",
    when: "This week, where you already live",
    need: "One neighbor. One act. Then tell what God did.",
    desk: "Live on Mission",
    href: "/mission",
    kind: "go" as const,
  },
] as const;

export const DESKS: {
  name: string;
  role: string;
  href?: string;
}[] = [
  {
    name: "This website",
    role: "The front door and the QR. Capture a donor, a seal, a helper. Route them.",
  },
  {
    name: "ChurchConnect",
    role: "Enter an event or a volunteer need once. People who should see it, see it — attend, receive, or help.",
    href: "https://churchconnect.unitedundergod.org",
  },
  {
    name: "Plenty",
    role: "The pantry. Food donors, inventory, recipients, waivers, meals served. Grocers can enter here or on this site.",
    href: "https://plenty.unitedundergod.org",
  },
  {
    name: "Operate",
    role: "The goods desk. Thrift, clothing, furniture. Pickup and delivery.",
    href: "https://operate.unitedundergod.org",
  },
  {
    name: "Live on Mission",
    role: "The public next step for a person who is ready to act this week. Same app as live-on-mission.com.",
    href: "https://liveonmission.unitedundergod.org",
  },
] as const;
