import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/doctrine")({
  component: DoctrinePage,
  head: () => ({
    meta: [{ title: "Doctrine — United Under God" }],
  }),
});

function Article({
  n,
  ordinal,
  id,
  title,
  children
}: {
  n: number;
  ordinal: string;
  id: string;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="doctrine-article" id={id}>
      <div className="doctrine-ordinal" aria-hidden="true">
        {String(n).padStart(2, "0")}
      </div>
      <div className="doctrine-article-body">
        <p className="doctrine-ordinal-word">{ordinal}</p>
        <h2>{title}</h2>
        {children}
      </div>
    </article>
  );
}

function Verse({ cite, children }: { cite: string; children: ReactNode }) {
  return (
    <blockquote className="doctrine-verse">
      <p>{children}</p>
      <cite>{cite}</cite>
    </blockquote>
  );
}

// The doctrine says plainly what it refuses, not only what it affirms. Those
// passages get their own voice so they are never mistaken for the affirmation.
function Reject({ children }: { children: ReactNode }) {
  return (
    <aside className="doctrine-reject">
      <p className="doctrine-reject-label">What we reject</p>
      {children}
    </aside>
  );
}

const ARTICLES: { id: string; ordinal: string; short: string }[] = [
  { id: "one", ordinal: "One", short: "God is the source of life" },
  { id: "two", ordinal: "Two", short: "Jesus came to give life" },
  { id: "three", ordinal: "Three", short: "Salvation is a gift of grace" },
  { id: "four", ordinal: "Four", short: "Grace does not leave us where it found us" },
  { id: "five", ordinal: "Five", short: "We are made in the image of God" },
  { id: "six", ordinal: "Six", short: "The Holy Spirit empowers us" },
  { id: "seven", ordinal: "Seven", short: "We are the light of the world" },
  { id: "eight", ordinal: "Eight", short: "Good works are the result, not the price" },
  { id: "nine", ordinal: "Nine", short: "Love is the central ethic" },
  { id: "ten", ordinal: "Ten", short: "His burden is light" },
  { id: "eleven", ordinal: "Eleven", short: "Gathered to be encouraged, sent to make a difference" },
  { id: "twelve", ordinal: "Twelve", short: "We unite, and we run the same direction" }
];

const UNITE_ON: string[] = [
  "God is good and is the source of life.",
  "Jesus Christ is Lord — crucified, risen, and the clearest picture of what the Father is like.",
  "Salvation is a gift of grace received through faith.",
  "Scripture teaches us the truth about God.",
  "The Holy Spirit empowers the life we are called to live.",
  "We are made in God's image and sent as light.",
  "Love is the central ethic.",
  "We are one body."
];

const SHARED_DIRECTION: { title: string; body: ReactNode }[] = [
  {
    title: "Lead with the goodness of God.",
    body: <>The first true thing anyone hears from us is that God is good and He is for them.</>
  },
  {
    title: "Refuse to add weight.",
    body: <>People arrive heavy enough. We will not use shame as a tool.</>
  },
  {
    title: "Let faith arrive as help.",
    body: (
      <>
        If our faith never reaches somebody&rsquo;s budget, marriage, loneliness, or front door, we have
        not finished believing it yet.
      </>
    )
  },
  {
    title: "Send people out.",
    body: <>The measure of a gathering is what its people do the rest of the week.</>
  },
  {
    title: "Keep love above being right.",
    body: <>Doctrine is never a weapon.</>
  },
  {
    title: "Move together.",
    body: <>United on the essentials, generous on the rest.</>
  }
];

function DoctrinePage() {
  return (
    <SiteShell>
    <div className="doctrine-root">
    <main id="top">
      {/* ---------------- opening ---------------- */}
      <section className="section doctrine-open">
        <p className="eyebrow">United Under God</p>
        <h1>Doctrine, Biblical Foundation &amp; Shared Direction</h1>
        <p className="doctrine-creed">God is good. God gives life.</p>
        <p className="lede">
          United Under God exists because we believe God is good, God gives life, and God desires His
          people to become participants in bringing His life, love, hope, freedom, and goodness into the
          world.
        </p>

        {/* Lincoln's own framing of why this doctrine exists at all. */}
        <div className="doctrine-heart">
          <p>
            We err on the side of unity and love &mdash; showing the fruits of the Spirit instead of
            criticism and rejection. The world will know God loves them by your unity.
          </p>
          <p>
            We, as religious people, as &ldquo;God&rsquo;s people,&rdquo; can&rsquo;t say God loves
            people and Jesus died for them if we refuse to love and be kind and understanding to the
            people around us.
          </p>
        </div>

        <nav className="doctrine-toc" aria-label="The twelve articles">
          <p className="doctrine-toc-label">The twelve</p>
          <ol>
            {ARTICLES.map((a, i) => (
              <li key={a.id}>
                <a href={`#${a.id}`}>
                  <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  {a.short}
                </a>
              </li>
            ))}
          </ol>
          <p className="doctrine-toc-foot">
            <a href="#foundation">Our foundation</a>
            <a href="#unity">What we unite on</a>
            <a href="#direction">Our shared direction</a>
          </p>
        </nav>
      </section>

      {/* ---------------- our foundation ---------------- */}
      <section className="section doctrine-section" id="foundation">
        <p className="eyebrow">Our foundation</p>
        <h2>Rescued for something.</h2>
        <div className="prose">
          <p>
            Jesus did not come merely so that people could survive this life while waiting for heaven.
          </p>
        </div>
        <Verse cite="Jesus — John 10:10">
          &ldquo;The thief comes only to steal and kill and destroy. I have come that they may have life,
          and have it in all its fullness.&rdquo;
        </Verse>
        <div className="prose">
          <p>
            We believe salvation is more than rescue <em>from</em> something. Through Jesus Christ, we are
            rescued <strong>for</strong> something:
          </p>
        </div>
        <ul className="doctrine-list">
          <li>Reconciliation with God</li>
          <li>New life through His Spirit</li>
          <li>Transformation into the likeness of Christ</li>
          <li>Belonging within His family</li>
          <li>Participation in His work in the world</li>
        </ul>
        <div className="prose">
          <p>
            United Under God therefore calls Christians, churches, ministries, businesses, community
            leaders, and ordinary people to unite around Jesus Christ and actively seek the good of one
            another and the communities God has placed around us.
          </p>
          <p className="doctrine-emphasis">
            Our faith is not merely something we believe. It becomes something we live.
          </p>
        </div>
      </section>

      {/* ---------------- the twelve ---------------- */}
      <section className="section doctrine-articles">
        <Article n={1} ordinal="One" id="one" title="God is the source of life.">
          <div className="prose">
            <p>
              Everything begins with God. God is not merely the judge of humanity. He is our Creator,
              Father, Savior, and the source from whom life flows.
            </p>
          </div>
          <Verse cite="Acts 17:28">&ldquo;For in Him we live and move and have our being.&rdquo;</Verse>
          <div className="prose">
            <p>
              Jesus revealed the character of the Father through His own life. He healed. He restored. He
              forgave. He fed people. He welcomed outsiders. He touched people others avoided. He defended
              the condemned. He gave dignity to people society had discarded. He brought hope to people who
              had lost it. And ultimately, He gave His own life so that others could live.
            </p>
          </div>
          <Verse cite="Jesus — John 14:9">
            &ldquo;Anyone who has seen Me has seen the Father.&rdquo;
          </Verse>
          <div className="prose">
            <p>
              Our doctrine begins not with humanity&rsquo;s failure, but with God&rsquo;s goodness. Human
              sin is real. Human brokenness is real. But neither is greater than the grace, goodness,
              power, and redemptive purpose of God.
            </p>
          </div>
        </Article>

        <Article n={2} ordinal="Two" id="two" title="Jesus came to give life.">
          <Reject>
            <p>
              A Christianity whose practical message becomes merely &ldquo;believe correctly, behave
              correctly, attend church, feel sufficiently guilty about your failures, and wait for
              heaven.&rdquo; Jesus announced something much greater.
            </p>
          </Reject>
          <Verse cite="Mark 1:15">
            &ldquo;The time is fulfilled, and the kingdom of God is near. Repent and believe in the
            gospel!&rdquo;
          </Verse>
          <div className="prose">
            <p>
              The Gospel is Good News. Through Jesus Christ: forgiveness is available &middot;
              reconciliation with God is available &middot; the Holy Spirit is available &middot; freedom
              is available &middot; transformation is available &middot; purpose is available &middot;
              belonging is available.
            </p>
            <p>
              Eternal life begins not merely after death, but in relationship with God now.
            </p>
          </div>
          <Verse cite="John 17:3">
            &ldquo;Now this is eternal life, that they may know You, the only true God, and Jesus Christ,
            whom You have sent.&rdquo;
          </Verse>
          <div className="prose">
            <p className="doctrine-emphasis">
              The Christian life is therefore not merely preparation for dying. It is learning how to truly
              live.
            </p>
          </div>
        </Article>

        <Article n={3} ordinal="Three" id="three" title="Salvation is a gift of grace.">
          <div className="prose">
            <p>
              We cannot purchase God&rsquo;s acceptance with morality, religious performance, suffering,
              shame, or sufficient remorse.
            </p>
          </div>
          <Verse cite="Ephesians 2:8–9">
            &ldquo;For it is by grace you have been saved through faith, and this not from yourselves; it
            is the gift of God, not by works, so that no one can boast.&rdquo;
          </Verse>
          <Reject>
            <p>
              Grace cannot simultaneously be a gift and something we earn by making ourselves miserable
              enough to deserve it. Repentance is real and necessary, but repentance is not payment for
              grace. Repentance is turning toward the God who is already reaching toward us.
            </p>
          </Reject>
          <div className="prose">
            <p>
              The cross demonstrates how seriously God takes sin &mdash; but also how extraordinarily far
              God&rsquo;s love will go to reconcile His children to Himself.
            </p>
          </div>
          <Verse cite="Romans 8:1">
            &ldquo;Therefore, there is now no condemnation for those who are in Christ Jesus.&rdquo;
          </Verse>
          <div className="prose">
            <p className="doctrine-emphasis">
              Therefore, shame is not the foundation upon which we build Christian lives. Grace is.
            </p>
          </div>
        </Article>

        <Article n={4} ordinal="Four" id="four" title="Grace does not leave us where it found us.">
          <div className="prose">
            <p>
              Grace is not permission to remain destructive, selfish, cruel, addicted, dishonest, or
              indifferent. Grace brings us into relationship with God, and relationship with God transforms
              us.
            </p>
          </div>
          <Verse cite="Philippians 2:13">
            &ldquo;For it is God who works in you to will and to act on behalf of His good purpose.&rdquo;
          </Verse>
          <div className="prose">
            <p>
              Christian transformation is not primarily humanity desperately attempting to become
              acceptable to God. It is God working within people who have already received His grace. The
              evidence looks like &ldquo;love, joy, peace, patience, kindness, goodness, faithfulness,
              gentleness, and self-control&rdquo; (Galatians 5:22&ndash;23).
            </p>
            <p>
              We measure maturity not by how much Scripture someone knows or how religious someone appears.
              We look for fruit. &ldquo;So then, by their fruit you will recognize them.&rdquo; (Matthew
              7:20)
            </p>
          </div>
          <p className="doctrine-refrain">
            Life produces life. Love produces love. Grace produces grace. Hope produces hope. Freedom
            produces freedom.
          </p>
          <div className="prose">
            <p>
              And people who experience the goodness of God should increasingly become people through whom
              others experience His goodness.
            </p>
          </div>
        </Article>

        <Article n={5} ordinal="Five" id="five" title="We are made in the image of God.">
          <div className="verse-pair doctrine-verse-pair">
            <blockquote className="doctrine-verse">
              <p>&ldquo;So God created man in His own image.&rdquo;</p>
              <cite>Genesis 1:27</cite>
            </blockquote>
            <blockquote className="doctrine-verse">
              <p>
                &ldquo;Therefore if anyone is in Christ, he is a new creation. The old has passed away.
                Behold, the new has come!&rdquo;
              </p>
              <cite>2 Corinthians 5:17</cite>
            </blockquote>
          </div>
          <div className="prose">
            <p>
              Sin has damaged humanity, but it has not erased God&rsquo;s intention for humanity.
              Christianity should not continually teach redeemed people to identify themselves primarily by
              what is wrong with them. Our identity is rooted in whose we are and who God is making us
              become.
            </p>
          </div>
          <Verse cite="Ephesians 2:10">
            &ldquo;For we are God&rsquo;s workmanship, created in Christ Jesus to do good works, which God
            prepared in advance as our way of life.&rdquo;
          </Verse>
          <div className="prose">
            <p className="doctrine-emphasis">
              Grace saves us, and grace restores us to meaningful participation in God&rsquo;s purposes.
            </p>
          </div>
        </Article>

        <Article
          n={6}
          ordinal="Six"
          id="six"
          title="The Holy Spirit empowers the life Jesus calls us to live."
        >
          <div className="prose">
            <p>
              Jesus did not leave His followers with merely a book of instructions and tell them to try
              harder. He promised His Spirit.
            </p>
          </div>
          <div className="verse-pair doctrine-verse-pair">
            <blockquote className="doctrine-verse">
              <p>
                &ldquo;But you will receive power when the Holy Spirit comes upon you, and you will be My
                witnesses.&rdquo;
              </p>
              <cite>Acts 1:8</cite>
            </blockquote>
            <blockquote className="doctrine-verse">
              <p>&ldquo;He will baptize you with the Holy Spirit and with fire.&rdquo;</p>
              <cite>Matthew 3:11</cite>
            </blockquote>
          </div>
          <div className="prose">
            <p className="doctrine-emphasis">
              The Christian life is not imitation of Jesus through human effort. It is Christ&rsquo;s life
              expressed through Spirit-filled people. God works within us and then through us.
            </p>
          </div>
        </Article>

        <Article n={7} ordinal="Seven" id="seven" title="We are the light of the world.">
          <div className="verse-pair doctrine-verse-pair">
            <blockquote className="doctrine-verse">
              <p>&ldquo;You are the light of the world. A city on a hill cannot be hidden.&rdquo;</p>
              <cite>Matthew 5:14</cite>
            </blockquote>
            <blockquote className="doctrine-verse">
              <p>&ldquo;I am the light of the world.&rdquo;</p>
              <cite>John 8:12</cite>
            </blockquote>
          </div>
          <div className="prose">
            <p>
              The light Jesus brought did not disappear when He ascended. His Spirit now lives within His
              people. Christians are called to carry His light into homes, neighborhoods, workplaces,
              businesses, schools, governments, friendships, communities, and places of suffering.
            </p>
          </div>
          <Verse cite="Matthew 5:16">
            &ldquo;Let your light shine before men, that they may see your good deeds and glorify your
            Father in heaven.&rdquo;
          </Verse>
          <div className="prose">
            <p className="doctrine-emphasis">
              Our light is not merely what we say. Our light becomes visible through the good we do.
            </p>
          </div>
        </Article>

        <Article
          n={8}
          ordinal="Eight"
          id="eight"
          title="Good works are the result of salvation, not the price of salvation."
        >
          <div className="verse-pair doctrine-verse-pair">
            <blockquote className="doctrine-verse">
              <p>
                &ldquo;For it is by grace you have been saved through faith&hellip; it is the gift of
                God.&rdquo;
              </p>
              <cite>Ephesians 2:8</cite>
            </blockquote>
            <blockquote className="doctrine-verse">
              <p>
                &ldquo;For we are God&rsquo;s workmanship, created in Christ Jesus to do good
                works.&rdquo;
              </p>
              <cite>Ephesians 2:10</cite>
            </blockquote>
          </div>
          <div className="prose">
            <p>
              We do not serve so God will love us. We serve because God loves us. We do not help people to
              earn salvation. We help because salvation is producing something within us. We do not love
              our neighbor to prove ourselves worthy. &ldquo;We love because He first loved us.&rdquo; (1
              John 4:19)
            </p>
          </div>
          <p className="doctrine-refrain">Grace received becomes grace expressed.</p>
        </Article>

        <Article n={9} ordinal="Nine" id="nine" title="Love is the central ethic of the Kingdom of God.">
          <div className="verse-pair doctrine-verse-pair">
            <blockquote className="doctrine-verse">
              <p>
                &ldquo;Love the Lord your God with all your heart and with all your soul and with all your
                mind.&rdquo;
              </p>
              <cite>Matthew 22:37</cite>
            </blockquote>
            <blockquote className="doctrine-verse">
              <p>&ldquo;Love your neighbor as yourself.&rdquo;</p>
              <cite>Matthew 22:39</cite>
            </blockquote>
          </div>
          <div className="prose">
            <p>&ldquo;All the Law and the Prophets hang on these two commandments.&rdquo; (Matthew 22:40)</p>
          </div>
          <Verse cite="Jesus — John 13:34–35">
            &ldquo;A new commandment I give you: Love one another. As I have loved you, so you also must
            love one another. By this everyone will know that you are My disciples, if you love one
            another.&rdquo;
          </Verse>
          <div className="prose">
            <p>
              Paul went further: &ldquo;If I have the gift of prophecy and can fathom all mysteries and all
              knowledge, and if I have absolute faith so as to move mountains, but have not love, I am
              nothing.&rdquo; (1 Corinthians 13:2)
            </p>
            <p>
              This is why we refuse to let doctrine become a weapon.{" "}
              <strong>
                Correct belief that produces contempt for people has already failed the test Jesus gave us.
              </strong>
            </p>
          </div>
          <p className="doctrine-refrain">
            Love is not the decoration on our doctrine. It is the point of it.
          </p>
        </Article>

        <Article
          n={10}
          ordinal="Ten"
          id="ten"
          title="His burden is light, and we will not make it heavy."
        >
          <div className="prose">
            <p>
              Most people do not arrive at church empty-handed. They arrive already carrying guilt, regret,
              shame, and a conscience that is heavy. Jesus knew exactly who would be coming to Him:
            </p>
          </div>
          <Verse cite="Jesus — Matthew 11:28–30">
            &ldquo;Come to Me, all you who are weary and burdened, and I will give you rest&hellip; For My
            yoke is easy and My burden is light.&rdquo;
          </Verse>
          <Reject>
            <p>
              Any ministry that takes people who are already weighed down and adds more weight &mdash;
              using shame as a tool, sorrow as a discipline, or a heavy conscience as proof of spiritual
              seriousness. Jesus reserved His sharpest words for exactly that: &ldquo;They tie up heavy,
              burdensome loads and lay them on men&rsquo;s shoulders, but they themselves are not willing
              to lift a finger to move them.&rdquo; (Matthew 23:4)
            </p>
          </Reject>
          <div className="prose">
            <p>
              Sin is not ignored here &mdash; it is dealt with. That is the entire point of the cross:
              &ldquo;If we confess our sins, He is faithful and just to forgive us our sins.&rdquo; (1 John
              1:9)
            </p>
            <p className="doctrine-emphasis">
              People do not need us to convince them they are failing. Most of them already believe it.
              They need to hear that God is good, that forgiveness is real, that the burden can come off,
              and that real life is available now.
            </p>
          </div>
        </Article>

        <Article
          n={11}
          ordinal="Eleven"
          id="eleven"
          title="We gather to be encouraged, and we are sent out to make a difference."
        >
          <div className="verse-pair doctrine-verse-pair">
            <blockquote className="doctrine-verse">
              <p>
                &ldquo;Let us consider how to spur one another on to love and good deeds&hellip; but let us
                encourage one another.&rdquo;
              </p>
              <cite>Hebrews 10:24–25</cite>
            </blockquote>
            <blockquote className="doctrine-verse">
              <p>&ldquo;To equip the saints for works of ministry.&rdquo;</p>
              <cite>Ephesians 4:11–12</cite>
            </blockquote>
          </div>
          <div className="prose">
            <p>
              Notice what the gathering is for: to spur on, to encourage, to equip.{" "}
              <strong>Church is not the destination.</strong> It is where we are fed, strengthened, and
              sent. We are not called to sit. We are called to go &mdash; and then to do something
              practical about what we find.
            </p>
          </div>
          <Verse cite="James 2:15–17">
            &ldquo;Suppose a brother or sister is without clothes and daily food. If one of you tells him,
            &lsquo;Go in peace; stay warm and well fed,&rsquo; but does not provide for his physical needs,
            what good is that? So too, faith by itself, if it does not result in action, is dead.&rdquo;
          </Verse>
          <div className="prose">
            <p className="doctrine-emphasis">
              We gather to be encouraged. We go to make a difference &mdash; in someone&rsquo;s budget,
              marriage, loneliness, front door, or neighborhood. Words without action are not enough.
            </p>
          </div>
        </Article>

        <Article
          n={12}
          ordinal="Twelve"
          id="twelve"
          title="We unite around Jesus Christ, and we run in the same direction."
        >
          <div className="verse-pair doctrine-verse-pair">
            <blockquote className="doctrine-verse">
              <p>
                &ldquo;That all of them may be one&hellip; so that the world may believe that You sent
                Me.&rdquo;
              </p>
              <cite>John 17:21</cite>
            </blockquote>
            <blockquote className="doctrine-verse">
              <p>
                &ldquo;There is one body and one Spirit&hellip; one Lord, one faith, one baptism.&rdquo;
              </p>
              <cite>Ephesians 4:4–6</cite>
            </blockquote>
          </div>
          <div className="prose">
            <p>
              Unity requires a shared direction. A movement cannot move if every step forward is met with
              objection over matters God never asked us to agree on.
            </p>
          </div>
          <Verse cite="Amos 3:3">&ldquo;Can two walk together without agreeing where to go?&rdquo;</Verse>
        </Article>
      </section>

      {/* ---------------- unite on / open hands ---------------- */}
      <section className="section doctrine-section" id="unity">
        <p className="eyebrow">Where we stand together</p>
        <h2>United on the essentials, generous on the rest.</h2>
        <div className="doctrine-columns">
          <div className="doctrine-column doctrine-column-unite">
            <h3>What we unite on</h3>
            <ul>
              {UNITE_ON.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="doctrine-column doctrine-column-open">
            <h3>What we hold with open hands</h3>
            <p>
              Denominational distinctives. Styles of worship and governance. Secondary interpretations and
              end-times timelines. The many honest disagreements Scripture itself treats as disputable.
            </p>
            <p>
              <strong>Keep your denomination and your associations</strong> &mdash; we are not competing
              with anyone.
            </p>
          </div>
        </div>
        <div className="prose">
          <p>
            Paul told the church to &ldquo;accept him whose faith is weak, without passing judgment on his
            opinions&rdquo; (Romans 14:1), and gave the standard we intend to keep: &ldquo;Let us pursue
            what leads to peace and to mutual edification.&rdquo; (Romans 14:19)
          </p>
          <p className="doctrine-emphasis">
            We are not asking anyone to agree about everything. We are asking people who love Jesus to stop
            stalling and start moving in the same direction.
          </p>
        </div>
      </section>

      {/* ---------------- our shared direction ---------------- */}
      <section className="section doctrine-section" id="direction">
        <p className="eyebrow">Our shared direction</p>
        <h2>What standing with United Under God means you will actually do.</h2>
        <p className="lede">
          For any church, business, charity, or person standing with United Under God &mdash; six
          commitments, plainly stated.
        </p>
        <ol className="doctrine-direction">
          {SHARED_DIRECTION.map((item, i) => (
            <li key={item.title}>
              <span className="doctrine-direction-n" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <blockquote className="doctrine-closing-verse">
          <p>
            &ldquo;He has shown you, O man, what is good. And what does the LORD require of you but to act
            justly, to love mercy, and to walk humbly with your God?&rdquo;
          </p>
          <cite>Micah 6:8</cite>
        </blockquote>
        <div className="doctrine-actions">
          <Link className="button button-primary" to="/join">
            Make the statement of intent
          </Link>
          <Link className="button" to="/organizations">
            How we help organizations
          </Link>
        </div>
      </section>

      {/* ---------------- doctrine you can see ----------------
          Derived copy, NOT doctrine: it connects the statement above to what we
          actually build, so the doctrine does not read as a page anyone can
          agree with and then leave. */}
      <section className="section mentality" id="practice">
        <p className="eyebrow">Doctrine you can see</p>
        <h2>This is why we build what we build.</h2>
        <p className="big-quote">
          &ldquo;There&rsquo;s a problem over there. <em>I wonder what I can do to help.</em> Maybe God
          let me see that problem so I could help.&rdquo;
        </p>
        <div className="prose">
          <p>
            Every part of United Under God comes out of what is on this page. The seal is a statement
            an organization chooses to make: to operate by God&rsquo;s principles, for its blessing, not
            under a threat. The united buying program and church office management exist because
            relieving a real burden is a spiritual act. The apps exist because loneliness, a straining
            marriage, a father who wants back in, a person searching for purpose &mdash; those are the
            places people actually live, and God is good in those places too.
          </p>
          <p>
            Grace received becomes grace expressed. That is how a culture changes: not by a system, and
            not by making people feel worse, but by people who have experienced the goodness of God
            becoming the people through whom others experience it.
          </p>
        </div>
      </section>

      <section className="section doctrine-foot">
        <nav className="legal-nav" aria-label="More">
          <a href="/">&larr; Home</a>
          <a href="/organizations">Organizations standing together &rarr;</a>
        </nav>
        {/* Required by the Berean Study Bible license — do not remove. */}
        <p className="scripture-credit">
          Scripture quotations are from The Holy Bible, Berean Study Bible, BSB. Copyright &copy; 2016,
          2020 by Bible Hub. Used by permission. All rights reserved worldwide.
        </p>
      </section>
    </main>
    </div>
    </SiteShell>
  );
}
