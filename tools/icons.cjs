// PWA 아이콘 생성: Kenney Tiny Dungeon 기사 스프라이트 + 일식(Eclipse) 링
const {PNG}=require('pngjs');const fs=require('fs');
const sheet=PNG.sync.read(fs.readFileSync('public/assets/img/dungeon.png'));
function make(S,maskable,out){
  const d=new PNG({width:S,height:S});const cx=S/2,cy=S/2;
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const i=(y*S+x)*4;
    const dx=x-cx,dy=y-cy,r=Math.hypot(dx,dy)/S;
    let R=13,G=18,B=34;
    // 일식 코로나
    const ring=Math.exp(-Math.pow((r-0.36)/0.05,2));
    R+=ring*255;G+=ring*150;B+=ring*60;
    const inner=Math.hypot(x-cx+S*0.03,y-cy+S*0.03)/S;
    if(inner<0.33){R=10;G=12;B=26;}
    d.data[i]=Math.min(255,R);d.data[i+1]=Math.min(255,G);d.data[i+2]=Math.min(255,B);d.data[i+3]=(!maskable&&r>0.5)?0:255;
    if(!maskable&&r>0.47&&r<=0.5){d.data[i+3]=255;}
  }
  // 기사(프레임 96) 확대
  const f=96,fx=(f%12)*16,fy=Math.floor(f/12)*16;const k=Math.floor(S*0.36/16);const ox=Math.round(cx-8*k),oy=Math.round(cy-8*k);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){const si=((fy+y)*sheet.width+fx+x)*4;if(sheet.data[si+3]<128)continue;
    for(let yy=0;yy<k;yy++)for(let xx=0;xx<k;xx++){const di=((oy+y*k+yy)*S+ox+x*k+xx)*4;d.data[di]=sheet.data[si];d.data[di+1]=sheet.data[si+1];d.data[di+2]=sheet.data[si+2];d.data[di+3]=255;}}
  fs.writeFileSync(out,PNG.sync.write(d));
}
make(192,false,'public/icons/icon-192.png');make(512,false,'public/icons/icon-512.png');make(512,true,'public/icons/maskable-512.png');make(180,true,'public/icons/apple-touch-icon.png');
