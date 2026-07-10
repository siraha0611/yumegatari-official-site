/* 夢ティ HO診断(kuizy.net/analysis/30665 と同一データ・同一ロジック)
   各選択肢の weights = [HO1, HO2, HO3, HO4]。合計が最大のHOが結果。 */
(function () {
  "use strict";

  var QUESTIONS = [
    { q: "Q1. 朝、目を覚ました直後、あなたは何をしていますか?", c: [
      ["A. しばらく夢の余韻に浸る。何を見たかメモする日もある", [10,1,0,5]],
      ["B. 思いついたことから動き出す。気分次第で予定も変える", [1,10,0,3]],
      ["C. まず時計を見て、今日の段取りを頭の中で組み立てる", [0,1,10,2]],
      ["D. 昨日心地よかった瞬間を、もう一度味わってから起き上がる", [4,2,0,10]]
    ]},
    { q: "Q2. 知らない街を訪れたとき、あなたが選ぶのは……", c: [
      ["A. 道に迷いながら、街の空気に身を任せて歩く", [10,3,0,3]],
      ["B. その場で気になった路地に、ふらっと入ってみる", [3,10,0,2]],
      ["C. 地図とルートを確かめて、自分で道を整理してから歩き出す", [0,1,10,2]],
      ["D. 立ち寄ったお店の匂いや手触りを、ゆっくり覚えながら歩く", [5,2,1,10]]
    ]},
    { q: "Q3. 喫茶アストレアの席に座ったあなた。最初に頼む一杯は?", c: [
      ["A. ノスタルジックなアールグレイ。香りに意識がほどけていく", [10,0,1,5]],
      ["B. その日初めて見るブレンド。気分でなんとなく選ぶ", [2,10,1,2]],
      ["C. 力強いアッサム。ミルクを合わせて、しっかり整える", [0,2,10,3]],
      ["D. やわらかなウバ。湯気と砂糖の溶ける温度を、ひと口ずつ確かめる", [4,1,2,10]]
    ]},
    { q: "Q4. 夜眠る前、あなたが考えていることは?", c: [
      ["A. 「今夜はどんな夢を見るんだろう」と少し楽しみにしている", [3,7,7,1]],
      ["B. 「明日は何が起こるかな」とまだ見ぬことを想像している", [3,7,3,1]],
      ["C. 「今日やり残したこと」を頭の中で片付けて、明日に渡している", [4,1,6,10]],
      ["D. 「今日のなかで好きな瞬間」を一つだけ思い返している", [7,2,10,2]]
    ]},
    { q: "Q5. 嫌な夢を見て目が覚めたとき、あなたは……", c: [
      ["A. しばらく現実か確かめるように、ぼんやり天井を見つめる", [10,1,0,4]],
      ["B. 「夢でよかった」と笑い飛ばして、いつもより早く動き出す", [1,10,2,2]],
      ["C. 怖さの正体を分析して、扱える形に整理する", [0,1,10,1]],
      ["D. 温かい飲み物を淹れて、ゆっくり気持ちを落ち着けてから動く", [4,2,3,10]]
    ]},
    { q: "Q6. もし「夢の世界」に行けるとしたら、あなたは何をしますか?", c: [
      ["A. 帰り道がわからなくなるくらい、その世界を歩き続ける", [10,4,0,3]],
      ["B. 飛んだり走ったり、思いついたことを片っ端から試す", [2,10,0,1]],
      ["C. 自分のルールを決めて、その世界の秩序を整える", [0,2,10,2]],
      ["D. お気に入りの場所を見つけて、何度でも通えるようにしておく", [4,2,2,10]]
    ]},
    { q: "Q7. 営業前の喫茶アストレア。あなたが自然に過ごしている姿は?", c: [
      ["A. 窓の外を見ながら、湯気越しに物思いに沈んでいる", [10,1,0,5]],
      ["B. 新しいレシピを思いついて、気軽に試している", [2,10,1,2]],
      ["C. 店内をぐるりと見渡して、整っていない場所をすぐ直す", [0,2,10,3]],
      ["D. 大切な人と分け合いたい一品を、今日のおすすめに置いている", [3,2,2,10]]
    ]},
    { q: "Q8. あなたにとって「夢」とは、どんな存在ですか?", c: [
      ["A. 心の奥にあるもう一つの世界。覗き込むほど引き込まれる", [10,1,0,4]],
      ["B. 自分次第で形を変えられる、もう一つの遊び場", [2,10,1,1]],
      ["C. 自分の意志で形を整える、もう一つの庭", [0,2,10,2]],
      ["D. お気に入りの手触りに、また触れられる場所", [4,1,1,10]]
    ]}
  ];

  var RESULTS = [
    {
      tag: "HO1：First〈マイスター〉",
      title: "【HO1】「夢に飲まれている」あなた",
      quote: "「あなたは夢に飲まれている。」",
      desc: "そこにあるのは、感受性の深さ。他の人が気にも留めない香りや光の機微を、まっすぐ拾える人です。言葉にならない予感を、急がず抱えていられる強さがある。\n喫茶アストレアでカウンターに立ったなら、あなたはきっと──\nHO1〈紅茶マイスター〉として、湯気の向こう側を静かに見つめているでしょう。"
    },
    {
      tag: "HO2：Second〈コック〉",
      title: "【HO2】「夢が自在である」あなた",
      quote: "「あなたは夢が自在であった。」",
      desc: "予定通りに進めるより、思いついた寄り道で景色を変えられる人。迷うより、まず手を動かす。動きながら答えを見つけていくタイプです。\n喫茶アストレアでなら、あなたはきっと──\nHO2〈コック〉として、厨房で今日だけの一皿を作っているでしょう。"
    },
    {
      tag: "HO3：Autumnal〈ウェイター〉",
      title: "【HO3】「夢を従えている」あなた",
      quote: "「あなたは夢を従えている。」",
      desc: "不安を消すより、扱える形に整える。状況の中に秩序を見つけて、自分や周りの拠り所を作れる人です。ぶれない判断軸を、自分の中に持っている。\n喫茶アストレアでなら、あなたはきっと──\nHO3〈ウェイター〉として、店全体を見渡しながら、ホールの空気を整えているでしょう。"
    },
    {
      tag: "HO4：Off〈パティシエ〉",
      title: "【HO4】「夢が愛おしかった」あなた",
      quote: "「あなたは夢が愛おしかった。」",
      desc: "小さな幸福を、丁寧に拾い集められる人。慌ただしい毎日のなかで「今日の好きな瞬間」を覚えていられる、そんな手触りの細やかさを持っています。\n喫茶アストレアでなら、あなたはきっと──\nHO4〈パティシエ〉として、大切な人と分け合うお菓子を、丁寧に焼き上げているでしょう。"
    }
  ];

  var state = { index: 0, scores: [0, 0, 0, 0], history: [] };

  var elIntro = document.getElementById("sd-intro");
  var elQuiz = document.getElementById("sd-quiz");
  var elResult = document.getElementById("sd-result");
  var elQ = document.getElementById("sd-question");
  var elChoices = document.getElementById("sd-choices");
  var elProgress = document.getElementById("sd-progress");
  var elBar = document.getElementById("sd-bar");
  var elBack = document.getElementById("sd-back");

  function show(el) { el.classList.remove("sd-hidden"); }
  function hide(el) { el.classList.add("sd-hidden"); }

  function start() {
    state = { index: 0, scores: [0, 0, 0, 0], history: [] };
    hide(elIntro); hide(elResult); show(elQuiz);
    render();
    elQuiz.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function render() {
    var item = QUESTIONS[state.index];
    elProgress.textContent = "Question " + (state.index + 1) + " / " + QUESTIONS.length;
    elBar.style.width = ((state.index) / QUESTIONS.length * 100) + "%";
    elQ.textContent = item.q;
    elChoices.innerHTML = "";
    item.c.forEach(function (choice) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sd-choice";
      btn.textContent = choice[0];
      btn.addEventListener("click", function () { pick(choice[1]); });
      elChoices.appendChild(btn);
    });
    elBack.style.visibility = state.index > 0 ? "visible" : "hidden";
    // ふわっと再生
    elQuiz.classList.remove("sd-anim");
    void elQuiz.offsetWidth;
    elQuiz.classList.add("sd-anim");
  }

  function pick(weights) {
    state.history.push(weights);
    for (var i = 0; i < 4; i++) state.scores[i] += weights[i];
    state.index++;
    if (state.index >= QUESTIONS.length) { finish(); } else { render(); }
  }

  function back() {
    if (state.index === 0 || state.history.length === 0) return;
    var w = state.history.pop();
    for (var i = 0; i < 4; i++) state.scores[i] -= w[i];
    state.index--;
    render();
  }

  function finish() {
    var max = Math.max.apply(null, state.scores);
    var winner = state.scores.indexOf(max);
    var r = RESULTS[winner];
    hide(elQuiz); show(elResult);
    document.getElementById("sd-r-tag").textContent = r.tag;
    document.getElementById("sd-r-title").textContent = r.title;
    document.getElementById("sd-r-quote").textContent = r.quote;
    document.getElementById("sd-r-desc").textContent = r.desc;

    var shareText = "私は" + r.title.replace(/あなた$/, "タイプ") + "でした！\n#夢語りはティータイムのあとで #HO診断 #CoC\n";
    var url = "https://siraha0611.github.io/yumegatari-official-site/shindan.html";
    document.getElementById("sd-share").href =
      "https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText) + "&url=" + encodeURIComponent(url);
    elResult.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.getElementById("sd-start").addEventListener("click", start);
  document.getElementById("sd-retry").addEventListener("click", start);
  elBack.addEventListener("click", back);
})();
