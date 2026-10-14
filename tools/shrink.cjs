const {PNG}=require('pngjs');const fs=require('fs');
const [,,inp,out,size]=process.argv;const S=+size;
const s=PNG.sync.read(fs.readFileSync(inp));const d=new PNG({width:S,height:S});const f=s.width/S;
for(let y=0;y<S;y++)for(let x=0;x<S;x++){let r=0,g=0,b=0,a=0,n=0;
for(let yy=Math.floor(y*f);yy<Math.floor((y+1)*f);yy++)for(let xx=Math.floor(x*f);xx<Math.floor((x+1)*f);xx++){const i=(yy*s.width+xx)*4;const al=s.data[i+3];r+=s.data[i]*al;g+=s.data[i+1]*al;b+=s.data[i+2]*al;a+=al;n++;}
const o=(y*S+x)*4;d.data[o]=a?r/a:0;d.data[o+1]=a?g/a:0;d.data[o+2]=a?b/a:0;d.data[o+3]=a/n;}
fs.writeFileSync(out,PNG.sync.write(d));
