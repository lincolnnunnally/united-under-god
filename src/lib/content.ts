export const NAV = [
  { to: "/", label: "The movement" },
  { to: "/mission", label: "Live on Mission" },
  { to: "/pantry", label: "Vidalia pantry" },
  { to: "/food-donors", label: "Stores" },
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
    body: "Churches and charities that buy together pay less for toner, supplies, and services — so the smallest church gets the same prices as the largest. Shared tools replace duplicate software bills. And stores that donate unsold food instead of throwing it away may deduct up to twice as much.",
  },
  {
    title: "Socially",
    body: "You don’t have to do it alone. You stand with pastors, business owners, charities, and civic leaders who have made the same commitment, and your community sees the church serving, not only gathering.",
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
    body: "Run your business on God’s principles and let your customers see it. Save on supplies through group buying, turn surplus into tax-deductible gifts, and display the seal so your team and your town know what you stand for.",
  },
  {
    title: "Charities",
    body: "You already serve — you shouldn’t have to do it alone, with your own software, your own suppliers, and your own exhausted volunteers. Share tools, share volunteers, and get connected with donors who want to help.",
  },
  {
    title: "Governments & civic work",
    body: "Partner with local churches and charities to meet real needs in your community. We help connect public resources, surplus, and volunteers to the neighbors who need them.",
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
      blurb: "Real stories of what God is doing through ordinary people — share yours and encourage the next person.",
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
      blurb: "Short, clear answers to real questions about faith, straight from Scripture.",
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
      href: "https://sandlot.unitedundergod.org",
      blurb: "Kids meetups, toy exchange, and supervised playdates — free, parent-run.",
    },
    {
      name: "Rally",
      href: "https://rally.unitedundergod.org",
      blurb: "Tennis and pickleball — find a hitting partner, book a lesson, start a league.",
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
      name: "Outreach",
      href: "https://live-on-mission.com/outreach",
      blurb: "Meet the neighbors around your church — a Gift Drop, a Block Party, or the Vidalia Serve Day. We plan it with you.",
    },
    {
      name: "Church sound, livestream & lighting",
      href: "/church-av",
      blurb: "Every word heard, every Sunday. Sound, streaming, and lighting planned and installed for your sanctuary.",
    },
    {
      name: "Neighborly",
      href: "https://neighborly.unitedundergod.org",
      blurb: "Neighbors helping neighbors, locally.",
    },
    {
      name: "Pulse",
      href: "https://pulse.unitedundergod.org",
      blurb: "Quick check-ins with your team so small problems surface before they become big ones.",
    },
    {
      name: "Operate",
      href: "https://operate.unitedundergod.org",
      blurb: "For thrift stores, clothing closets, and furniture ministries — track donations, list what’s available, and schedule pickup or delivery.",
    },
  ],
  practical: [
    {
      name: "EasyPeazy",
      href: "https://easypeazy.unitedundergod.org",
      blurb: "Domains, hosting, and websites without the tech overwhelm.",
    },
    {
      name: "AI Website Design",
      href: "https://ai-website.design",
      blurb: "A finished website for your business or ministry, built with your own photos and logo. Change anything by clicking it.",
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
      name: "Group buying",
      href: "/buying",
      blurb: "Churches and charities pool orders for toner, paper, and supplies — and pay less.",
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
export const PLENTY_STORES = "https://plenty.unitedundergod.org/for-stores";
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
    desk: "United Under God, then Plenty",
    deskNote: "Sign up here for your donation receipts. Pickups are scheduled through Plenty, our food pantry program.",
    blurb: "Sign up once here, then schedule pickups on Plenty whenever food is ready. Your tax receipts come from United Under God, Inc., a 501(c)(3).",
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
    deskNote: "If you run a thrift store or clothing closet, Operate tracks what comes in and goes out.",
    blurb: "Join Operate to receive donated goods, or offer your surplus to ministries that need it.",
  },
] as const;

export const HAPPENINGS = [
  {
    title: "Help open the Vidalia food pantry",
    when: "Saturdays",
    need: "Packers, shelf-builders, and anyone with a truck",
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
    role: "Start here. Join, give, volunteer, or ask a question, and we will point you to the right place.",
  },
  {
    name: "ChurchConnect",
    role: "Church events, volunteer sign-ups, and announcements, so the right people hear about them.",
    href: "https://churchconnect.unitedundergod.org",
  },
  {
    name: "Plenty",
    role: "Our food pantry. Get food, volunteer a shift, or schedule a grocery pickup.",
    href: "https://plenty.unitedundergod.org",
  },
  {
    name: "Operate",
    role: "Donate or request furniture, clothing, and household goods. Pickup and delivery available.",
    href: "https://operate.unitedundergod.org",
  },
  {
    name: "Live on Mission",
    role: "Find a real way to serve a neighbor this week, and sign up in a minute.",
    href: "https://liveonmission.unitedundergod.org",
  },
] as const;
