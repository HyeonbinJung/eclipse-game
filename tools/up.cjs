const {PNG}=require('pngjs');const fs=require('fs');
const [,,inp,out,k]=process.argv;const K=+k||5;
const src=PNG.sync.read(fs.readFileSync(inp));
const W=src.width*K,H=src.height*K;const dst=new PNG({width:W,height:H});
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const sx=Math.floor(x/K),sy=Math.floor(y/K);const si=(sy*src.width+sx)*4,di=(y*W+x)*4;
let r=src.data[si],g=src.data[si+1],b=src.data[si+2],a=src.data[si+3];
if(a<10){const c=((sx>>4)+(sy>>4))%2?60:90;r=g=b=c;a=255}
if(x%(16*K)==0||y%(16*K)==0){r=255;g=0;b=255;a=255}
dst.data[di]=r;dst.data[di+1]=g;dst.data[di+2]=b;dst.data[di+3]=a;}
fs.writeFileSync(out,PNG.sync.write(dst));
