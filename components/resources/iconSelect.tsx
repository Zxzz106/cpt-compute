
export default function iconSelect(name: string): string {
    // 文件夹
    if (name.endsWith('/')) return '📂';
    else return '📄';
    
    // 图片类型
    if (name.match(/\.(jpg|jpeg|png|gif|bmp|svg|webp|ico|tif|tiff|psd|ai|eps|raw|heic|heif)$/i)) return '🖼️';
    
    // 视频类型
    if (name.match(/\.(mp4|mkv|avi|mov|wmv|flv|webm|mpeg|mpg|m4v|ogv|3gp|3g2|mts|m2ts|ts|vob)$/i)) return '🎬';
    
    // 音频类型
    if (name.match(/\.(mp3|wav|flac|aac|ogg|wma|m4a|aiff|ape|alac|mid|midi|opus)$/i)) return '🎵';
    
    // 压缩包类型
    if (name.match(/\.(zip|rar|7z|tar|gz|bz2|xz|lzma|cab|iso|tar.gz|tar.bz2|tar.xz|z|deb|rpm)$/i)) return '🗜️';
    
    // PDF文件
    if (name.match(/\.(pdf)$/i)) return '📕';
    
    // 电子表格
    if (name.match(/\.(xls|xlsx|ods|csv|tsv|numbers)$/i)) return '📊';
    
    // 演示文稿
    if (name.match(/\.(ppt|pptx|odp|key)$/i)) return '📈';
    
    // Web相关文件
    if (name.match(/\.(js|ts|jsx|tsx|css|json|xml|html|htm|xhtml|scss|sass|less|vue|svelte|astro)$/i)) return '🌐';
    
    // 脚本文件
    if (name.match(/\.(sh|bat|ps1|cmd|bash|zsh|fish|ksh|csh)$/i)) return '💻';
    
    // 可执行文件
    if (name.match(/\.(exe|bin|dll|so|dylib|sys|app|msi|pkg|apk|ipa)$/i)) return '⚙️';
    
    // 文档文件
    if (name.match(/\.(txt|md|rtf|log|doc|docx|odt|pages|wpd|wps)$/i)) return '📄';
    
    // 代码文件
    if (name.match(/\.(c|cpp|h|hpp|java|py|rb|go|rs|php|swift|kt|cs|vb|pl|pm|r|scala|groovy|lua|perl|tcl|asm|s|dart|coffee)$/i)) return '📝';
    
    // 数据库文件
    if (name.match(/\.(sql|db|sqlite|db3|mdb|accdb|frm|myd|myi|parquet|avro)$/i)) return '🗄️';
    
    // 字体文件
    if (name.match(/\.(ttf|otf|woff|woff2|eot|svg|fon|fnt)$/i)) return '🔤';
    
    // 电子书
    if (name.match(/\.(epub|mobi|azw|azw3|fb2|lit|pdb)$/i)) return '📚';
    
    // 备份文件
    if (name.match(/\.(bak|backup|tmp|temp|old|orig)$/i)) return '🔄';
    
    // 配置文件
    if (name.match(/\.(ini|conf|config|yml|yaml|toml|cfg|properties|env|bashrc|zshrc)$/i)) return '⚙️';
    
    // 虚拟机文件
    if (name.match(/\.(vmdk|vdi|vhd|vhdx|ova|ovf|qcow2)$/i)) return '🖥️';
    
    // 证书文件
    if (name.match(/\.(pem|cer|crt|key|p12|pfx|jks)$/i)) return '🔐';
    
    // 3D模型/工程文件
    if (name.match(/\.(step|stl|iges|igs|brep|obj|fbx|dae|3ds|max|c4d|blend)$/i)) return '🏗️';
    
    // CAE/仿真文件
    if (name.match(/\.(nas|nastran|bdf)$/i)) return '🔬'; // Nastran文件
    if (name.match(/\.(inp)$/i)) return '🔬'; // Abaqus输入文件
    
    // Fluent文件
    if (name.match(/\.(trn|msh|cas|dat|msh\.h5|cas\.h5|dat\.h5)$/i)) return '💨'; // Fluent流体仿真
    
    // MATLAB文件
    if (name.match(/\.(m|mat|mlx|fig|p)$/i)) return '📊'; // MATLAB脚本/数据
    
    // Gaussian文件
    if (name.match(/\.(chk|gjf|gau|log|fchk)$/i)) return '⚛️'; // 量子化学计算
    
    // 日志文件
    if (name.match(/\.(log|out|err|debug|trace)$/i)) return '📜';
    
    // 项目文件
    if (name.match(/\.(sln|vcxproj|csproj|pom|gradle|makefile|cmake|dockerfile)$/i)) return '📁';
    
    // 默认图标
    return '📄';
};