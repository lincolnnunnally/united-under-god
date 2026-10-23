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

export type AppEntry = {
  /** Anchor on /apps (unitedundergod.org/apps#slug). */
  slug: string;
  name: string;
  /** The app's own site, or an internal page on this site. */
  href: string;
  /** Who it is for, in plain words. */
  who: string;
  blurb: string;
};

/**
 * Every app and service this site points to. Each gets its own section on
 * /apps with an id so it can be linked and found; the app's own site does the
 * selling. Keep blurbs to what the app actually does today.
 */
export const APPS: {
  hope: AppEntry[];
  church: AppEntry[];
  practical: AppEntry[];
} = {
  hope: [
    {
      slug: "live-on-mission",
      name: "Live On Mission",
      href: "https://liveonmission.unitedundergod.org",
      who: "Anyone who wants a real way to help a neighbor this week.",
      blurb: "See the need. Do the thing. Tell the story. Browse local needs and ways to serve, sign up, and share what God did.",
    },
    {
      slug: "spark-of-hope",
      name: "Spark of Hope",
      href: "https://spark.unitedundergod.org",
      who: "People who want encouragement, and people with a story to tell.",
      blurb: "Real stories of what God is doing through ordinary people. Share yours and encourage the next person.",
    },
    {
      slug: "kindred-connections",
      name: "Kindred Connections",
      href: "https://kindred.unitedundergod.org",
      who: "Adults looking for real friends and a group to grow with.",
      blurb: "Friendships and growth groups around purpose.",
    },
    {
      slug: "aligned-souls",
      name: "Aligned Souls",
      href: "https://alignedsouls.unitedundergod.org",
      who: "Single Christians looking for a partner.",
      blurb: "Dating partners who help you become who God designed you to be.",
    },
    {
      slug: "kids-need-dads",
      name: "Kids Need Dads",
      href: "https://dads.unitedundergod.org",
      who: "Fathers, and the people who want to stand with them.",
      blurb: "Support, mentorship, and restoration for fathers.",
    },
    {
      slug: "childfirst-solutions",
      name: "ChildFirst Solutions",
      href: "https://childfirst.unitedundergod.org",
      who: "Separated or divorced parents raising children together.",
      blurb: "Co-parenting support and child-focused tools for families in conflict.",
    },
    {
      slug: "best-life",
      name: "Best Life",
      href: "https://bestlife.unitedundergod.org",
      who: "Anyone ready to grow in one area of life at a time.",
      blurb: "Growth pathways: relational, financial, spiritual, mental, emotional, and physical.",
    },
    {
      slug: "speak-to-me",
      name: "Speak to Me",
      href: "https://speak-to-me.unitedundergod.org",
      who: "Anyone who wants a simple daily Bible reading habit.",
      blurb: "Simple personal Bible reading, one day at a time.",
    },
    {
      slug: "understanding-the-bible",
      name: "Understanding the Bible",
      href: "/bible",
      who: "Anyone with an honest question about faith.",
      blurb: "Short, clear answers to real questions about faith, straight from Scripture, with the verses.",
    },
    {
      slug: "presence",
      name: "Presence",
      href: "https://presence.unitedundergod.org",
      who: "Hosts and guests who want time together to be simple.",
      blurb: "Simple ways to host and enjoy the presence of others.",
    },
    {
      slug: "immerse",
      name: "Immerse",
      href: "https://immerse.unitedundergod.org",
      who: "Families and friends who want time outdoors.",
      blurb: "Nature immersion camping on public land, with simple trip planning.",
    },
    {
      slug: "barefoot-coalition",
      name: "Barefoot Coalition",
      href: "https://barefoot.unitedundergod.org",
      who: "People interested in natural living and grounding.",
      blurb: "Natural living and grounding, rooted in nature and united in purpose.",
    },
    {
      slug: "dreamstand",
      name: "Dreamstand",
      href: "https://dreamstand.unitedundergod.org",
      who: "Kids with an idea, and the parents cheering them on.",
      blurb: "Kids turn ideas into little businesses: courage, money, and a flop that is only a lesson.",
    },
    {
      slug: "sandlot",
      name: "Sandlot",
      href: "https://sandlot.unitedundergod.org",
      who: "Parents who want their kids playing with other kids.",
      blurb: "Kids meetups, toy exchange, and supervised playdates, run by parents.",
    },
    {
      slug: "rally",
      name: "Rally",
      href: "https://rally.unitedundergod.org",
      who: "Tennis and pickleball players of any level.",
      blurb: "Find a hitting partner, book a lesson, or start a league.",
    },
  ],
  church: [
    {
      slug: "churchconnect",
      name: "ChurchConnect",
      href: "https://www.churchconnect.cloud",
      who: "Church secretaries, pastors, and the volunteers who keep a church running.",
      blurb: "Church software for people, events, groups, volunteers, giving records, and Sunday communication. Enter it once.",
    },
    {
      slug: "plenty",
      name: "Plenty",
      href: "https://plenty.unitedundergod.org",
      who: "Neighbors in Vidalia who need groceries, and the people who help.",
      blurb: "The Vidalia food pantry. Get food, volunteer a shift, or give. Grocers schedule food pickups here.",
    },
    {
      slug: "pastors-circle",
      name: "Vidalia / Toombs Pastors Circle",
      href: "https://www.churchconnect.cloud/association",
      who: "Pastors in Vidalia and Toombs County.",
      blurb: "Local pastors standing together, not competing for a town that belongs to God.",
    },
    {
      slug: "outreach",
      name: "Outreach",
      href: "https://live-on-mission.com/outreach",
      who: "Churches that want to meet the neighbors around their building.",
      blurb: "A Neighbor Gift Drop, a Block Party, or the Vidalia Serve Day. Send a request and we plan it with you.",
    },
    {
      slug: "church-sound-video",
      name: "Church sound, livestream & lighting",
      href: "/church-av",
      who: "Churches whose sound, stream, or lighting fights them every Sunday.",
      blurb: "Sound, streaming, and lighting planned and installed for your sanctuary, with your volunteers trained.",
    },
    {
      slug: "neighborly",
      name: "Neighborly",
      href: "https://neighborly.unitedundergod.org",
      who: "Neighbors who want to help and be helped close to home.",
      blurb: "Neighbors helping neighbors, locally.",
    },
    {
      slug: "pulse",
      name: "Pulse",
      href: "https://pulse.unitedundergod.org",
      who: "Leaders of staff and volunteer teams.",
      blurb: "Quick check-ins with your team so small problems surface before they become big ones.",
    },
  ],
  practical: [
    {
      slug: "easypeazy",
      name: "EasyPeazy",
      href: "https://easypeazy.site",
      who: "Churches and small businesses that need a website without learning hosting.",
      blurb: "Describe your church or business and we design, write, and host the website. Domains, hosting, and a website without the tech overwhelm.",
    },
    {
      slug: "ai-website-design",
      name: "AI Website Design",
      href: "https://ai-website.design",
      who: "Businesses that want a finished website quickly.",
      blurb: "A finished website for your business, built with your own photos and logo. Change anything by clicking it.",
    },
    {
      slug: "group-buying",
      name: "Group buying",
      href: "/buying",
      who: "Churches, charities, and Christian-owned businesses that buy supplies.",
      blurb: "Pool orders for toner, paper, and supplies with other organizations, and pay less.",
    },
    {
      slug: "toner-management",
      name: "Toner Management",
      href: "https://toner.management",
      who: "Offices tired of running out of toner.",
      blurb: "We watch your printers and get toner to the right desk before anyone runs out.",
    },
    {
      slug: "toner-connect",
      name: "Toner Connect",
      href: "https://tonerconnect.unitedundergod.org",
      who: "Organizations that want printer monitoring and group prices on supplies.",
      blurb: "Printer monitoring and a buying group for supplies. Keep your supplier, buy from us, or join a group buy.",
    },
    {
      slug: "operate",
      name: "Operate",
      href: "https://operate.unitedundergod.org",
      who: "Thrift stores and clothing closets, and households with goods to give.",
      blurb: "Track donated furniture, clothing, and household goods, list what is available, and schedule pickup or delivery.",
    },
    {
      slug: "porchlight",
      name: "Porchlight",
      href: "https://porchlight.unitedundergod.org",
      who: "People looking for a house in Vidalia and Toombs County.",
      blurb: "Off-market houses in Vidalia and Toombs: buy, repair, live, rent, or sell.",
    },
    {
      slug: "laser-engrave-market",
      name: "Laser Engrave Market",
      href: "https://laser.unitedundergod.org",
      who: "Anyone who needs a custom gift, product, or branded piece.",
      blurb: "Custom engraving for gifts, products, and business branding.",
    },
    {
      slug: "ideas",
      name: "Ideas",
      href: "https://ideas.unitedundergod.org",
      who: "Writers, teachers, and anyone who loses good ideas.",
      blurb: "Capture an idea the moment it arrives and forge it into content.",
    },
    {
      slug: "app-engine",
      name: "App Engine",
      href: "https://appengine.unitedundergod.org",
      who: "Organizations with a problem a simple app could solve.",
      blurb: "Describe a problem. Get a working app built for it.",
    },
  ],
};

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
export const CHURCHCONNECT_URL = "https://www.churchconnect.cloud";

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
    href: CHURCHCONNECT_URL,
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
