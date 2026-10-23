import type { Faq } from "@/lib/church-av";
import { absoluteUrl, ORG_ID } from "@/lib/seo";

/**
 * Problem-first pages under /church-av/help/<slug>. Each one is written for the
 * pastor or committee member who has the problem and does not yet know that
 * equipment is the answer: why it happens, what fixes it, how fixing it serves
 * the mission, a real case study or testimonial from src/data/church-av.json,
 * and the request form.
 *
 * Rules (also enforced by scripts/church-av.test.mjs): no prices or amounts,
 * no ratings, no ranking promises, the installer is never named, and no
 * claim of legal obligation. Case studies are cited with the city the data
 * gives them; nothing here claims work "in" a city.
 */

export type HelpFix = { title: string; body: string };
export type HelpStep = { name: string; text: string };
export type HelpPage = {
  slug: string;
  /** Short label for link lists and the planner's multi-select. */
  label: string;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  lead: string;
  whyTitle: string;
  why: string[];
  fixes: HelpFix[];
  /** Optional ordered steps; rendered on the page and mirrored as HowTo JSON-LD. */
  steps?: { title: string; intro: string; items: HelpStep[] };
  mission: string[];
  services: string[];
  caseStudies: string[];
  testimonial: string;
  related: string[];
  faq: Faq[];
};

export const HELP_PAGES: HelpPage[] = [
  {
    slug: "cant-hear-in-the-back",
    label: "People can’t hear in the back",
    title: "Church Members Can’t Hear in the Back Pews? | United Under God",
    description:
      "Why the back rows of a sanctuary miss the sermon even when it is loud enough up front, and the speaker, microphone, and room fixes that reach every pew.",
    h1: "When the back pews can’t hear the sermon",
    eyebrow: "For pastors and committees · Sound",
    lead: "It is loud enough at the pulpit. It is loud enough in the front rows. Halfway back, people lean forward, and in the last pews they nod along to words they did not catch. This page explains why that happens and what actually fixes it.",
    whyTitle: "Why the back of the room loses the words",
    why: [
      "Sound gets weaker the farther it travels. A speaker that is comfortable in the front row can be half as loud a few rows later, so whoever sets the volume from the front is setting it for the front.",
      "The bigger problem is usually not volume but clarity. In the back, more of what reaches a listener has bounced off the ceiling, walls, and floor first. Those reflections arrive a split second late and smear the consonants that make words understandable. People say “I can hear it, I just can’t understand it.”",
      "Many sanctuaries still use speakers chosen decades ago, or a pair of speakers on either side of the platform that throw sound at the walls as much as at the seats. Turning them up makes the echo louder too.",
    ],
    fixes: [
      {
        title: "Speakers aimed at the seats",
        body: "A modern system is designed so the sound lands on the congregation and not on the walls and ceiling. Sometimes that means different speakers; sometimes it means adding smaller delay or fill speakers partway back so the last rows hear the pulpit as clearly as the first.",
      },
      {
        title: "Tuning for speech, not just music",
        body: "Once speakers are in place, the system is aligned and tuned to the room with measurements. A speech-first tuning makes the sermon intelligible without having to make it loud.",
      },
      {
        title: "Microphones that pick up the voice, not the room",
        body: "The right pulpit, lectern, and wireless microphones, placed and set correctly, send more of the speaker’s voice into the system and less of everything around it.",
      },
      {
        title: "Acoustic treatment where the room needs it",
        body: "In hard rooms, a few well-placed acoustic panels reduce the reflections that blur speech, so every seat gets a cleaner signal before anyone touches a fader.",
      },
    ],
    mission: [
      "Faith comes by hearing (Romans 10:17). When the back pews miss the sermon, the people most likely to sit there — visitors, families with small children, the ones who slipped in late — are the ones who leave without the word.",
      "Clear sound in every seat means nobody has to choose between sitting where they are comfortable and understanding what is being preached.",
    ],
    services: ["church-sound-system-installation", "church-acoustic-treatment"],
    caseStudies: ["mount-vernon", "st-jude-the-apostle", "mountain-view-baptist"],
    testimonial: "jerry-allen",
    related: [
      "hearing-aids-squeal-or-echo",
      "feedback-during-the-sermon",
      "older-members-staying-home",
    ],
    faq: [
      {
        q: "Can’t we just turn it up?",
        a: "Usually that makes it louder in the front and only slightly clearer in the back, because the echo gets louder too. The fix is getting more direct sound to the back rows, not more total sound in the room.",
      },
      {
        q: "Do we have to replace everything?",
        a: "Not always. Sometimes adding fill speakers, re-aiming what is there, or tuning the system is the right first step. The Dream phase looks at the room and what you already own before recommending anything.",
      },
      {
        q: "Will new speakers change how our sanctuary looks?",
        a: "They do not have to. Speakers can be chosen and placed to suit the architecture, which matters a great deal in traditional rooms.",
      },
    ],
  },
  {
    slug: "hearing-aids-squeal-or-echo",
    label: "Hearing aids squeal or echo",
    title: "Hearing Aids Squeal or Echo in Church? Why & What Helps | United Under God",
    description:
      "Why members with hearing aids hear squeal and echo in the sanctuary, and how hearing loops, Auracast, and receivers send the sermon straight to the ear.",
    h1: "When members with hearing aids hear squeal and echo",
    eyebrow: "For pastors and committees · Hearing and assistive listening",
    lead: "A faithful member tells you the service is a blur of echo, or that their hearing aids whistle when the music starts. Some have stopped wearing them in church. Others have stopped coming. This is one of the most fixable problems a sanctuary has.",
    whyTitle: "What is actually happening",
    why: [
      "The squeal is the hearing aid itself. A hearing aid is a tiny microphone and speaker sitting in the ear. When amplified sound leaks back out and into its own microphone, it feeds back and whistles. Loud sound in the room, a hand or hymnal near the ear, or an aid pushed to its limits by a loud system all make it more likely. It can also simply over-amplify a loud moment until it distorts.",
      "The echo and muddiness come from the room. In a sanctuary with hard surfaces and a tall ceiling, sound keeps bouncing for a second or more after it is spoken. A hearing aid’s microphone, sitting in the pew, picks up all of it — the reflections, the air conditioning, the rustle of bulletins — and amplifies it along with the sermon. A person with hearing loss has a harder time separating the words from the reverberation than everyone else does.",
      "Turning the main system up does not help them. It adds more of the same echo and makes the squeal worse.",
    ],
    fixes: [
      // OWNER: confirm with installer before claiming install
      {
        title: "A hearing loop to the hearing aid’s “T” setting",
        body: "A hearing (induction) loop is a wire around the seating area that carries the sound from the sound board as a magnetic signal. Hearing aids and cochlear implants with a telecoil pick it up directly when switched to the “T” or telecoil setting — no room echo, no squeal, just the microphone feed. Many hearing aids have a telecoil, but not all, and an audiologist sometimes needs to turn it on.",
      },
      {
        title: "Auracast for newer hearing aids and phones",
        body: "Auracast is Bluetooth LE Audio broadcast. The sound board’s feed is broadcast in the room, and newer hearing aids, earbuds, and phones that support it can tune in directly. It is newer, so it works for some members today and more each year.",
      },
      {
        title: "RF or IR receivers with earbuds",
        body: "For members without compatible hearing aids, a small radio-frequency (RF) or infrared (IR) receiver with earbuds or headphones delivers the same clean feed. Receivers are kept at the welcome desk and handed out each service.",
      },
      {
        title: "Better speaker coverage and acoustic treatment",
        body: "Speakers aimed at the seats instead of the walls, and acoustic treatment where the room is hardest, reduce echo for everyone — including members with hearing aids who do not use a receiver.",
      },
    ],
    steps: {
      title: "Choosing an assistive listening option",
      intro:
        "There is no single right answer for every church. These are the questions that decide it, and we’ll help you choose the right option.",
      items: [
        {
          name: "Ask who needs it",
          text: "Find out how many members wear hearing aids or cochlear implants, and whether their devices have a telecoil or support Auracast. Their audiologist can tell them.",
        },
        {
          name: "Look at the room",
          text: "Loops depend on the building’s structure and seating layout; IR needs line of sight; RF and Auracast pass through walls. The room shapes the choice.",
        },
        {
          name: "Plan for people without compatible aids",
          text: "Whatever the main option, keep a few receivers with earbuds or headphones at the welcome desk for those who need them.",
        },
        {
          name: "Feed it from the sound board",
          text: "Every option sends the board’s mix straight to the ear, so the microphones and the mix matter. A clear speech mix is the foundation.",
        },
        {
          name: "Tell people it is there",
          text: "Post the symbol at the doors, mention it in the bulletin, and have greeters offer a receiver. A system nobody knows about helps nobody.",
        },
      ],
    },
    mission: [
      "The members most affected are often the ones who have been in those pews the longest. Helping them hear again is not a technical upgrade; it is honoring the people who built the church.",
      "Churches are generally not required to provide assistive listening — religious organizations are largely exempt from the ADA’s public-accommodation rules. Churches do it because they love their members and want every one of them in the room and hearing the word.",
    ],
    services: ["church-sound-system-installation", "church-acoustic-treatment"],
    caseStudies: ["st-jude-the-apostle", "mountain-view-baptist", "legacy-church"],
    testimonial: "jerry-allen",
    related: [
      "cant-hear-in-the-back",
      "older-members-staying-home",
      "traditional-sanctuary-without-a-big-screen",
    ],
    faq: [
      {
        q: "Which is better: a hearing loop or Auracast?",
        a: "It depends on your members and your room. Loops work with the telecoils already in many hearing aids; Auracast works with newer hearing aids and phones and is spreading quickly. Many churches combine one of them with a few receivers for everyone else. We’ll help you choose the right option.",
      },
      {
        q: "Are churches legally required to have assistive listening?",
        a: "Generally not; religious organizations are largely exempt from the ADA’s public-accommodation rules. If you are planning a new building, ask your architect what your local building code says. Most churches add it because they want every member to hear.",
      },
      {
        q: "Will a new sound system fix the squeal by itself?",
        a: "Better speaker coverage and tuning reduce echo and harshness for everyone, which helps. But the most direct fix for hearing-aid users is assistive listening that sends the sound straight to the ear.",
      },
    ],
  },
  {
    slug: "livestream-keeps-dropping",
    label: "The livestream keeps dropping",
    title: "Church Livestream Keeps Dropping or Going Silent? | United Under God",
    description:
      "Why a church livestream freezes, drops, or goes silent at the worst moment, and the internet, encoder, and audio fixes that keep it steady every Sunday.",
    h1: "When the livestream drops at the worst moment",
    eyebrow: "For pastors and committees · Livestream",
    lead: "The stream freezes during the sermon, goes silent during the invitation, or the people at home hear the band but not the preacher. Someone at home texts the church office. Here is why it keeps happening and what makes it dependable.",
    whyTitle: "Why church livestreams fail",
    why: [
      "Most church streams started as a quick fix: a laptop, a camera, and the building’s Wi-Fi. Wi-Fi in a full sanctuary competes with every phone in the room, and the stream is the first thing to suffer.",
      "Many streams also share a computer that is doing other jobs — running lyrics, recording, updating itself — so it runs out of capacity right when the service gets busy.",
      "When the stream is silent or thin, the problem is usually the audio, not the internet. The mix that sounds right in the room is built around what the room already hears naturally. Online, the drums can be loud and the pastor barely there, or a cable can go to the wrong input and nobody notices until Monday.",
    ],
    fixes: [
      {
        title: "A wired connection and an upload you can count on",
        body: "The stream gets its own wired network connection, tested for upload speed during a real service, not on a quiet Tuesday.",
      },
      {
        title: "Dedicated streaming equipment",
        body: "A hardware encoder or a computer that does nothing but stream, so it is not competing with lyrics or recordings for capacity.",
      },
      {
        title: "A separate mix for the people at home",
        body: "The stream gets its own audio mix with steady levels, so the sermon is clear online even when the room needs something different. Recording a backup locally means nothing is lost if the connection hiccups.",
      },
      {
        title: "A routine volunteers can repeat",
        body: "The same start-up steps every week, labeled and written down, with presets that bring the system back to a known good state.",
      },
    ],
    steps: {
      title: "What you can check this week",
      intro: "Before anything is replaced, these checks often find the cause.",
      items: [
        {
          name: "Test the upload during a service",
          text: "Run a speed test from the streaming computer while the building is full. Compare it with what your streaming platform recommends for your resolution.",
        },
        {
          name: "Plug in a cable",
          text: "If the stream runs on Wi-Fi, try a wired connection for one Sunday and see if the drops stop.",
        },
        {
          name: "Listen on headphones",
          text: "Have someone listen to the actual stream on headphones, not the room, for one whole service and write down when the sound changes.",
        },
        {
          name: "Record locally as a backup",
          text: "Record the service on the streaming device or the board, so even a dropped stream can be posted afterward.",
        },
      ],
    },
    mission: [
      "For homebound members, people in the hospital, and family who moved away, the stream is their church on Sunday. When it drops at the invitation, someone at home misses the moment the whole service was building toward.",
      "A steady stream also reaches people who are not ready to walk in the door yet. It is often their first visit.",
    ],
    services: ["church-livestream-setup", "church-broadcast-imag"],
    caseStudies: ["unity-baptist", "immaculate-heart-of-mary", "church-unlimited"],
    testimonial: "tony-yang",
    related: [
      "older-members-staying-home",
      "volunteers-cant-run-the-board",
      "traditional-sanctuary-without-a-big-screen",
    ],
    faq: [
      {
        q: "Do we need expensive cameras for a better stream?",
        a: "Usually the audio and the connection matter more than the camera. People will watch a modest picture with clear sound; they turn off a sharp picture they cannot hear.",
      },
      {
        q: "Can cameras be added without changing how our sanctuary looks?",
        a: "Yes. Small PTZ (pan-tilt-zoom) cameras can be mounted discreetly and controlled from the booth by one volunteer.",
      },
    ],
  },
  {
    slug: "feedback-during-the-sermon",
    label: "Feedback during the sermon",
    title: "Feedback Squealing During the Sermon? Why It Happens | United Under God",
    description:
      "Why church microphones squeal and howl during the sermon or prayer, and the microphone, speaker, and tuning changes that stop feedback at its source.",
    h1: "When the microphones squeal during the sermon",
    eyebrow: "For pastors and committees · Sound",
    lead: "The pastor steps away from the pulpit and the room howls. Someone pulls a fader down in a panic. The prayer is interrupted, again. Feedback is not bad luck; it has causes, and they can be fixed.",
    whyTitle: "Why feedback happens",
    why: [
      "Feedback is a loop. A microphone hears the speaker, the speaker plays the microphone, and the sound goes around and around, getting louder each time until it rings. It happens at the frequencies where the room and the system reinforce each other most.",
      "It gets worse when the microphone is far from the mouth (so it has to be turned up), when a speaker points back at the microphone, when the room is hard and reflective, and when someone walks in front of the main speakers with a wireless mic.",
      "Older systems often have very little room between “loud enough” and “feeding back.” Volunteers learn to keep it quiet, and then the back pews cannot hear.",
    ],
    fixes: [
      {
        title: "The right microphone for each person",
        body: "A headset or well-placed lapel mic for a pastor who walks; a directional pulpit mic for one who stays; choir mics voiced for the choir. A microphone close to the mouth needs far less gain.",
      },
      {
        title: "Speakers placed so they do not feed the microphones",
        body: "Main speakers are positioned and aimed so the platform sits outside their coverage, and monitors are chosen so they do not point straight into a live microphone.",
      },
      {
        title: "Gain structure and tuning",
        body: "The system is set up so each microphone has headroom, then tuned with measurements so the frequencies most likely to ring are tamed before the service, not during it.",
      },
      {
        title: "Acoustic treatment",
        body: "Treating the surfaces that reflect most strongly back toward the platform increases how loud the system can go before it rings.",
      },
    ],
    steps: {
      title: "What you can try this Sunday",
      intro:
        "These do not replace a proper fix, but they often calm things down while you plan one.",
      items: [
        {
          name: "Move the microphone closer",
          text: "Ask speakers to stay a hand’s width from the pulpit mic, or switch to a headset, so the mic can be turned down.",
        },
        {
          name: "Walk the platform",
          text: "Have someone walk the stage with a live wireless mic before the service and mark the spots where it rings. Ask speakers to avoid them.",
        },
        {
          name: "Mute what is not in use",
          text: "Every open microphone adds to the loop. Mute choir and instrument mics when they are not being used.",
        },
        {
          name: "Write down when it happens",
          text: "Note which microphone, where the person was standing, and what was happening. That record makes the real fix much faster.",
        },
      ],
    },
    mission: [
      "Feedback breaks the moment. A squeal during prayer or an altar call pulls every person in the room out of what God is doing and onto the sound booth.",
      "It also wears on the volunteers who run sound. Fixing it lets them serve with confidence instead of dread.",
    ],
    services: ["church-sound-system-installation", "church-acoustic-treatment"],
    caseStudies: ["mountain-view-baptist", "st-jude-the-apostle", "unity-baptist"],
    testimonial: "tony-yang",
    related: [
      "cant-hear-in-the-back",
      "volunteers-cant-run-the-board",
      "hearing-aids-squeal-or-echo",
    ],
    faq: [
      {
        q: "Will a feedback suppressor fix it?",
        a: "It can catch a few problem frequencies, but it cannot fix a microphone that is too far away or a speaker aimed at the platform. It works best as the last step after placement and tuning.",
      },
      {
        q: "Is this the same squeal hearing aid users hear?",
        a: "No. Room feedback comes from the sound system; the whistle hearing aid users hear is usually the hearing aid itself. Both have fixes, and our page on hearing aids explains the second one.",
      },
    ],
  },
  {
    slug: "volunteers-cant-run-the-board",
    label: "Volunteers can’t run the board",
    title: "Church Volunteers Can’t Run the Sound Board? | United Under God",
    description:
      "When only one volunteer knows the church sound board, every Sunday is fragile. Presets, labels, simpler systems, and training turn it into a team.",
    h1: "When only one volunteer can run the sound board",
    eyebrow: "For pastors and committees · Volunteers",
    lead: "One faithful person knows how the board works. When they are sick or on vacation, Sunday is a gamble. New volunteers try once and do not come back. The board is not too hard for your people; it was never set up for them.",
    whyTitle: "Why the board feels impossible",
    why: [
      "Most church systems grew one piece at a time. Each new microphone, cable, and setting was added by whoever was there, and the knowledge of how it all fits lives in one person’s head.",
      "Older consoles start from scratch every week: every knob has to be set by hand, and nothing on the board says what it is for.",
      "Without training, new volunteers learn by being thrown in on a Sunday morning. One bad week is usually enough to scare them off.",
    ],
    fixes: [
      {
        title: "A digital console with saved presets",
        body: "A modern console recalls a known good setup with one button: the Sunday morning service, the Wednesday night study, the funeral. Volunteers start from right, not from zero.",
      },
      {
        title: "Labels and a simplified layout",
        body: "Every channel is named for what it is — Pastor, Choir, Piano — and the controls a volunteer actually needs are put in front, with everything else out of the way.",
      },
      {
        title: "Training on-site, on your system",
        body: "Training happens after the system is commissioned and again on-site the first Sunday, with your volunteers, on your equipment, during a real service.",
      },
      {
        title: "Someone to call",
        body: "Clear documentation, a one-page Sunday checklist, and support after the install so a volunteer is never stuck alone.",
      },
    ],
    mission: [
      "Running sound is a ministry. A system your volunteers can learn opens that ministry to more people — including young people who are looking for a way to serve.",
      "It also protects the one person who has been carrying it alone. They deserve a Sunday off.",
    ],
    services: [
      "church-sound-system-installation",
      "church-livestream-setup",
      "church-stage-lighting",
    ],
    caseStudies: ["unity-baptist", "central-church", "mount-vernon"],
    testimonial: "tony-yang",
    related: ["feedback-during-the-sermon", "livestream-keeps-dropping", "planning-a-new-building"],
    faq: [
      {
        q: "Will a new digital board be harder for our older volunteers?",
        a: "Set up well, it is easier. Presets and labels mean fewer decisions on a Sunday morning, and training happens on your system before anyone has to run it alone.",
      },
      {
        q: "Can you help with the board we already own?",
        a: "Often, yes. Reorganizing, labeling, and training on existing equipment can be a sensible first step. The Dream phase looks at what you already have.",
      },
    ],
  },
  {
    slug: "traditional-sanctuary-without-a-big-screen",
    label: "We’re traditional and don’t want a big screen",
    title: "Better Church Sound Without a Big Screen Behind the Pulpit | United Under God",
    description:
      "For traditional sanctuaries: better microphones, speakers, discreet cameras, and assistive listening, with no screen behind the pulpit and the room left as it is.",
    h1: "Better sound for a traditional sanctuary, without a big screen",
    eyebrow: "For traditional churches · Sound · Hearing · Livestream",
    lead: "Your sanctuary is beautiful and your people love it. The cross, the pulpit, the choir, the windows — nobody wants a screen hung in front of any of it. You do not need one. Most of what a traditional church needs is invisible.",
    whyTitle: "What traditional rooms actually struggle with",
    why: [
      "Traditional sanctuaries were built for unamplified voices and organs: tall ceilings, plaster, wood, and glass. That is wonderful for congregational singing and hard on the spoken word once a sound system is added.",
      "Their congregations often include many older members, and hearing loss makes echo and muddy sound much harder to follow. Members with hearing aids hear squeal and blur.",
      "When “AV” is mentioned, committees picture a concert stage. So the real needs — clear microphones, the right speakers, a way for homebound members to watch — get postponed along with the screen nobody wanted.",
    ],
    fixes: [
      {
        title: "Better microphones",
        body: "Pulpit, lectern, and choir microphones chosen to disappear into the room and to capture voices clearly, including choir microphones voiced for the choir.",
      },
      {
        title: "Speakers that suit the architecture",
        body: "Speakers selected and placed to respect the sightlines and finishes of the room while putting clear speech in every pew.",
      },
      // OWNER: confirm with installer before claiming install
      {
        title: "Assistive listening",
        body: "A hearing loop, Auracast, or receivers with earbuds that send the sermon straight to the ears of members with hearing loss. We’ll help you choose the right option.",
      },
      {
        title: "Discreet PTZ cameras for homebound members",
        body: "Small pan-tilt-zoom cameras mounted out of the way and run by one volunteer, so members who cannot come can still worship with you.",
      },
      {
        title: "Side displays only if you want them",
        body: "If hymn numbers or announcements would help, small displays at the side of the room can do it without touching the chancel. Many traditional churches choose none at all.",
      },
    ],
    mission: [
      "A traditional sanctuary carries the memory of baptisms, weddings, and funerals. Keeping its character while letting every member hear is a way of honoring both the room and the people in it.",
      "It is also how a church keeps its oldest members: in the room when they can come, and on the stream when they cannot.",
    ],
    services: [
      "church-sound-system-installation",
      "church-livestream-setup",
      "church-acoustic-treatment",
    ],
    caseStudies: ["immaculate-heart-of-mary", "st-jude-the-apostle", "madison-methodist"],
    testimonial: "jerry-allen",
    related: ["hearing-aids-squeal-or-echo", "older-members-staying-home", "cant-hear-in-the-back"],
    faq: [
      {
        q: "Do we have to put a screen up to get better sound?",
        a: "No. Sound, assistive listening, and cameras are separate from screens. Many traditional churches upgrade all three and never add a screen.",
      },
      {
        q: "Will the equipment be visible?",
        a: "As little as possible. Placement, finishes, and mounting are chosen with the architecture in mind, and you tell us what must stay untouched.",
      },
    ],
  },
  {
    slug: "older-members-staying-home",
    label: "Older members are staying home",
    title: "Older Church Members Staying Home? Livestream & Hearing Help | United Under God",
    description:
      "When older members stop coming because they cannot hear or cannot travel, clearer sound, assistive listening, and a dependable livestream bring them back.",
    h1: "When older members start staying home",
    eyebrow: "For pastors and committees · Hearing · Livestream",
    lead: "Some of your most faithful members have quietly stopped coming. A few say it is the drive or their health. Many will not say it is because they cannot hear anymore. Both have answers.",
    whyTitle: "Why older members drift away",
    why: [
      "Hearing loss is common with age, and a reverberant sanctuary makes it much worse. When the service becomes a blur of echo, sitting through it is tiring and lonely, and staying home starts to feel easier.",
      "Hearing aids help in conversation but often struggle in a large hard room: they amplify the echo and can squeal when the music starts.",
      "For members who can no longer travel, the livestream is their church. If it drops, goes silent, or is hard to start, they lose the connection entirely.",
    ],
    fixes: [
      // OWNER: confirm with installer before claiming install
      {
        title: "Assistive listening in the sanctuary",
        body: "A hearing loop to the hearing aid’s “T” setting, Auracast for newer hearing aids and phones, or receivers with earbuds for everyone else. Each sends the sermon straight to the ear. We’ll help you choose the right option.",
      },
      {
        title: "Clearer sound for everyone",
        body: "Speakers aimed at the seats, tuned for speech, so the words are clear in every pew and not only the front.",
      },
      {
        title: "A livestream that does not drop",
        body: "A wired connection, dedicated streaming equipment, and a separate audio mix so the sermon is clear at home.",
      },
      {
        title: "A stream that is easy to find",
        body: "The same link and the same start time every week, so a family member can set it up once and a homebound member can find it on their own.",
      },
    ],
    mission: [
      "Older members are the memory of the church. Keeping them connected — in the pew when they can come, on the stream when they cannot — is care, not technology.",
      "It also reaches their families. Adult children watching from another city are often the ones who later walk through the door.",
    ],
    services: ["church-livestream-setup", "church-sound-system-installation"],
    caseStudies: ["immaculate-heart-of-mary", "unity-baptist", "st-jude-the-apostle"],
    testimonial: "jerry-allen",
    related: [
      "hearing-aids-squeal-or-echo",
      "livestream-keeps-dropping",
      "traditional-sanctuary-without-a-big-screen",
    ],
    faq: [
      {
        q: "Will a livestream keep people from coming back in person?",
        a: "For members who can come, clearer sound in the room is the stronger draw. The stream is for the ones who cannot, and for family who live elsewhere.",
      },
      {
        q: "Our older members do not use technology much. Will they use this?",
        a: "Receivers are handed out at the door and need no setup, and a hearing loop works with the “T” setting many hearing aids already have. For the stream, keep one link and one start time every week.",
      },
    ],
  },
  {
    slug: "planning-a-new-building",
    label: "We’re planning a new building",
    title: "Planning a New Church Building? When to Plan Sound & Video | United Under God",
    description:
      "Plan sound, video, lighting, and assistive listening with the architect, before walls go up, so the room serves your people and nothing is retrofitted.",
    h1: "Planning a new church building? Bring sound and video in early",
    eyebrow: "For building committees · New construction",
    lead: "The building committee has met for months. The architect has drawings. Somewhere on the list is “sound system,” usually near the end. That order is the most common and most expensive mistake in church construction.",
    whyTitle: "Why audio and video belong at the start",
    why: [
      "A sanctuary’s shape, ceiling, and finishes decide how it will sound before a single speaker is chosen. Once the walls are up, fixing an echo means adding treatment to a room that could have been designed right.",
      "Speakers, cameras, screens, and lights need power, conduit, structural rigging points, and cooling. If those are not in the drawings, they are cut in later — or the system is compromised to fit what was built.",
      "Committees are often told to choose AV last because it is the last thing installed. It is installed last, but it has to be designed first.",
    ],
    fixes: [
      {
        title: "Design with the architect",
        body: "Detailed schematics, rigging and electrical drawings, and heating and cooling calculations go to the architect and the other trades while the drawings can still change.",
      },
      {
        title: "Room acoustics from the start",
        body: "Ceiling shape, wall surfaces, and treatment planned so speech is clear and music is full, without retrofitting panels after the fact.",
      },
      // OWNER: confirm with installer before claiming install
      {
        title: "Assistive listening planned in",
        body: "A loop, Auracast, or receivers decided before the floor is poured, when it is easiest. We’ll help you choose the right option, and your architect can tell you what your local building code says.",
      },
      {
        title: "Reuse what still serves",
        body: "Equipment from the old building that still has life in it can be relocated and recommissioned in the new one.",
      },
      {
        title: "A program report the committee can read",
        body: "A clear report that explains the system in non-technical language, with 3D renderings of the design choices, so the committee can approve it with confidence.",
      },
    ],
    steps: {
      title: "When to bring audio and video into the project",
      intro: "A simple order that keeps the room, the budget, and the schedule aligned.",
      items: [
        {
          name: "During the vision and schematic phase",
          text: "Share how you worship — traditional, blended, or modern — and who you want to reach. That shapes the room itself.",
        },
        {
          name: "Before design development is finished",
          text: "Get AV schematics, rigging points, power, conduit, and cooling loads into the architect’s drawings.",
        },
        {
          name: "Before construction documents are final",
          text: "Coordinate with the electrical, mechanical, and structural trades so nothing has to be cut in later.",
        },
        {
          name: "During construction",
          text: "Rough-in happens with the other trades, then equipment setup, commissioning, and final verification once the room is finished.",
        },
        {
          name: "Before the first Sunday",
          text: "Train your volunteers on the finished system, and have the installation team there for the first service.",
        },
      ],
    },
    mission: [
      "A new building is a generational decision. Getting the sound, video, and lighting right is what lets it serve the next forty years of baptisms, sermons, and Sunday mornings instead of fighting them.",
      "It also stewards the gift. Money given for the building goes further when nothing has to be torn out and done twice.",
    ],
    services: [
      "church-sound-system-installation",
      "church-acoustic-treatment",
      "church-broadcast-imag",
    ],
    caseStudies: [
      "lakeside-church",
      "lake-point-community-church",
      "level-grove",
      "central-church",
    ],
    testimonial: "tony-yang",
    related: [
      "traditional-sanctuary-without-a-big-screen",
      "volunteers-cant-run-the-board",
      "hearing-aids-squeal-or-echo",
    ],
    faq: [
      {
        q: "Our architect says the AV contractor can come in later. Is that true?",
        a: "Installation comes later; design does not. Rigging, power, conduit, cooling, and acoustics are all decided by the drawings. The earlier AV design joins the project, the fewer changes later.",
      },
      {
        q: "Can we use our existing equipment in the new building?",
        a: "Often some of it, yes. Central Church in Covington, GA relocated and recommissioned its existing audio and lighting into a new sanctuary, alongside a new digital audio console and lighting console.",
      },
      {
        q: "How do we get this past the building committee?",
        a: "The Dream phase produces a program report in non-technical language, 3D renderings of the design choices, and initial budgets, written for the people who have to approve it. The Church Room Planner on this site is a good place to start the conversation.",
      },
    ],
  },
];

export function getHelpPage(slug: string) {
  return HELP_PAGES.find((p) => p.slug === slug);
}

export function helpPath(page: HelpPage) {
  return `/church-av/help/${page.slug}`;
}

/** Problems a church can pick in the planner: every help page except the building one. */
export const PLANNER_PROBLEMS = HELP_PAGES.filter((p) => p.slug !== "planning-a-new-building");

/** Help pages that fit a service id, for linking from state and city pages. */
const SERVICE_HELP: Record<string, string[]> = {
  "church-sound-system-installation": ["cant-hear-in-the-back", "feedback-during-the-sermon"],
  "church-livestream-setup": ["livestream-keeps-dropping", "older-members-staying-home"],
  "church-stage-lighting": ["volunteers-cant-run-the-board"],
  "church-led-wall": ["traditional-sanctuary-without-a-big-screen"],
  "church-projection": ["traditional-sanctuary-without-a-big-screen"],
  "church-broadcast-imag": ["livestream-keeps-dropping"],
  "church-acoustic-treatment": ["hearing-aids-squeal-or-echo", "cant-hear-in-the-back"],
};

export function helpForServices(serviceIds: string[], limit = 4) {
  const slugs = new Set<string>();
  for (const id of serviceIds) for (const slug of SERVICE_HELP[id] ?? []) slugs.add(slug);
  // Hearing is the most common unspoken need; keep it in every list.
  slugs.add("hearing-aids-squeal-or-echo");
  return [...slugs]
    .slice(0, limit)
    .map((slug) => getHelpPage(slug))
    .filter((p): p is HelpPage => Boolean(p));
}

// ---------------------------------------------------------------- JSON-LD

type JsonLd = Record<string, unknown>;

export function helpArticleJsonLd(page: HelpPage): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.h1,
    description: page.description,
    url: absoluteUrl(helpPath(page)),
    mainEntityOfPage: absoluteUrl(helpPath(page)),
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    datePublished: "2026-10-23",
    dateModified: "2026-10-23",
    audience: { "@type": "Audience", audienceType: "Pastors and church committees" },
    inLanguage: "en-US",
  };
}

/** Mirrors the visible steps exactly. */
export function helpHowToJsonLd(page: HelpPage): JsonLd | null {
  if (!page.steps) return null;
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: page.steps.title,
    description: page.steps.intro,
    step: page.steps.items.map((item, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: item.name,
      text: item.text,
    })),
  };
}
