const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "ecpr_commander_v6.0.html");
const out = path.join(root, "ecpr_commander_v6.0_legacy.txt");

let s = fs.readFileSync(src, "utf8");

s = s.replace(
  "<!-- 2026-06-19 | v6.1.0 | Enter遷移・送血14-16Fr・ECPR操作盤整理・蘇生処置タブ -->",
  "<!-- 2026-06-19 | v6.1.1 Legacy | 時刻欄重なり修正・記号ASCII化 -->"
);
s = s.replace(
  '<meta charset="utf-8">\n<meta name="viewport"',
  '<meta charset="utf-8">\n<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">\n<meta name="viewport"'
);
s = s.replace("user-scalable=no,viewport-fit=cover", "user-scalable=no");
s = s.replace(/<meta name="apple-mobile-web-app-capable"[^>]*>\n/g, "");
s = s.replace(/<meta name="apple-mobile-web-app-status-bar-style"[^>]*>\n/g, "");
s = s.replace(/<link rel="manifest" href="manifest.json">\n/g, "");
s = s.replace("<title>ECPR Commander v6.0</title>", "<title>ECPR Commander v6.0 Legacy</title>");
s = s.replace(
  "--safe-top:env(safe-area-inset-top);--safe-bottom:env(safe-area-inset-bottom);",
  "--safe-top:0px;--safe-bottom:0px;"
);
s = s.replace(
  `input[type=time]{cursor:pointer;min-height:44px}
input[type=time]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:1;width:100%;height:100%;position:absolute;left:0;top:0;margin:0;padding:0}
.time-field{position:relative}
.time-field input[type=time]{position:relative}
.cann-size-chips,.cann-site-chips{margin:4px 0 6px}`,
  "input[type=time]{cursor:pointer;min-height:44px}\n.cann-size-chips,.cann-site-chips{margin:4px 0 6px}"
);
s = s.replace(".time-field{position:relative;display:block}\n", "");
s = s.replace(/data-delta="-1">−<\/button>/g, 'data-delta="-1">-</button>');
s = s.replace(/data-delta="1">＋<\/button>/g, 'data-delta="1">+</button>');
s = s.replace('${open?"▼":"▶"}', '${open?"v":">"}');
s = s.replace(
  `  bindTimePickers(){
    document.querySelectorAll('input[type=time]').forEach(el=>{
      if(!el.parentElement.classList.contains("time-field")){
        const w=document.createElement("div");
        w.className="time-field";
        el.parentNode.insertBefore(w,el);
        w.appendChild(el);
      }
      const open=()=>{if(typeof el.showPicker==="function")try{el.showPicker();}catch(err){el.focus();}};
      el.addEventListener("click",open);
    });
  }`,
  `  bindTimePickers(){
    document.querySelectorAll('input[type=time]').forEach(el=>{
      el.addEventListener("click",()=>el.focus());
    });
  }`
);
s = s.replace(
  'body{font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",Meiryo,sans-serif;',
  'body{font-family:Meiryo,"Yu Gothic",sans-serif;'
);
s = s.replace(
  '.log{font-family:Consolas,"SF Mono",monospace;',
  ".log{font-family:Meiryo,Consolas,monospace;"
);
s = s.replace(
  'font-family:Consolas,"SF Mono",monospace;font-size:12.5px',
  "font-family:Meiryo,Consolas,monospace;font-size:12.5px"
);
s = s.replace(
  "#reportModal .modal-box{width:min(720px,92vw);max-width:92vw;height:min(58vh,560px);max-height:58vh;",
  "#reportModal .modal-box{width:92vw;max-width:720px;height:58vh;max-height:560px;"
);
s = s.replace(/data-close="[^"]+">×<\/button>/g, (m) => m.replace("×", "x"));
s = s.replace("v6.0 CPA/ECPR Record", "v6.0 Legacy CPA/ECPR Record");
s = s.replace('this.key="ecpr_commander_v6";', 'this.key="ecpr_commander_v6_legacy";');
s = s.replace(
  `      if(!raw){
        const old=localStorage.getItem("ecpr_commander_v5");
        if(old)return this.mergeState(d,JSON.parse(old));
      }`,
  `      if(!raw){
        const v6=localStorage.getItem("ecpr_commander_v6");
        if(v6)return this.mergeState(d,JSON.parse(v6));
        const v5=localStorage.getItem("ecpr_commander_v5");
        if(v5)return this.mergeState(d,JSON.parse(v5));
      }`
);

fs.writeFileSync(out, s, "utf8");
console.log("written:", out);
