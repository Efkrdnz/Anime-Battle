// Tier list categories. Picks are "animeId/characterId" (first form) or "animeId/characterId/variantId".
import type { TierTopic } from '../engine/tier';
import type { Entry } from '../types';
import { BUILTIN_ENTRIES } from '.';

export interface TierCategory extends TierTopic {
  /** One line shown on the category card. */
  blurb: string;
  picks: string[];
}

/** Well-known faces from every anime, used by the "question" categories. */
const ICONIC = [
  'onepiece/monkey-d-luffy/post-timeskip', 'onepiece/roronoa-zoro', 'onepiece/vinsmoke-sanji', 'onepiece/nami', 'onepiece/nico-robin/post-timeskip',
  'onepiece/shanks', 'onepiece/portgas-d-ace', 'onepiece/trafalgar-d-water-law', 'onepiece/boa-hancock', 'onepiece/donquixote-doflamingo',
  'onepiece/kaido', 'onepiece/buggy/captain', 'onepiece/tony-tony-chopper/post-timeskip', 'onepiece/brook/post-timeskip', 'onepiece/usopp',
  'naruto/naruto-uzumaki/part-2', 'naruto/sasuke-uchiha/part-2', 'naruto/kakashi-hatake', 'naruto/itachi-uchiha', 'naruto/madara-uchiha/edo-tensei',
  'naruto/gaara', 'naruto/jiraiya/sannin', 'naruto/might-guy/base', 'naruto/rock-lee/part-1', 'naruto/orochimaru', 'naruto/hinata-hyuga',
  'naruto/sakura-haruno', 'naruto/shikamaru-nara', 'naruto/tsunade', 'naruto/deidara', 'naruto/hidan', 'naruto/minato-namikaze',
  'bleach/ichigo-kurosaki', 'bleach/sosuke-aizen', 'bleach/kenpachi-zaraki', 'bleach/byakuya-kuchiki', 'bleach/rukia-kuchiki',
  'bleach/kisuke-urahara', 'bleach/yoruichi-shihoin', 'bleach/mayuri-kurotsuchi', 'bleach/grimmjow-jaegerjaquez', 'bleach/kon',
  'bleach/gin-ichimaru', 'bleach/orihime-inoue',
  'jojo/jotaro-kujo/part3', 'jojo/dio-brando/the-world', 'jojo/joseph-joestar/young', 'jojo/giorno-giovanna', 'jojo/yoshikage-kira',
  'jojo/rohan-kishibe', 'jojo/jean-pierre-polnareff',
  'hxh/gon-freecss/hunter-exam', 'hxh/killua-zoldyck', 'hxh/hisoka-morow', 'hxh/kurapika', 'hxh/meruem/post-rose', 'hxh/chrollo-lucilfer',
  'hxh/leorio-paradinight',
  'jjk/satoru-gojou/prime', 'jjk/ryoumen-sukuna/heian', 'jjk/yuuji-itadori', 'jjk/megumi-fushiguro', 'jjk/nobara-kugisaki', 'jjk/kento-nanami',
  'jjk/aoi-toudou', 'jjk/touji-fushiguro', 'jjk/mahito', 'jjk/panda',
  'csm/denji/chainsaw-man', 'csm/makima', 'csm/power', 'csm/aki-hayakawa', 'csm/kobeni', 'csm/reze', 'csm/pochita',
  'dandadan/okarun', 'dandadan/momo-ayase', 'dandadan/turbo-granny', 'dandadan/jiji', 'dandadan/serpo',
  'dxd/issei-hyoudou', 'dxd/rias-gremory', 'dxd/akeno-himejima', 'dxd/koneko-toujou', 'dxd/asia-argento', 'dxd/vali-lucifer', 'dxd/azazel',
];

const WAIFUS = [
  'onepiece/nami', 'onepiece/nico-robin/post-timeskip', 'onepiece/boa-hancock', 'onepiece/yamato', 'onepiece/uta', 'onepiece/shirahoshi/princess',
  'onepiece/nefertari-vivi/post-timeskip', 'onepiece/perona/post-timeskip', 'onepiece/jewelry-bonney/post-timeskip', 'onepiece/carrot',
  'onepiece/rebecca', 'onepiece/vinsmoke-reiju', 'onepiece/kozuki-hiyori', 'onepiece/charlotte-pudding', 'onepiece/kalifa', 'onepiece/monet',
  'onepiece/viola', 'onepiece/makino', 'onepiece/tashigi/post-timeskip',
  'naruto/tsunade', 'naruto/hinata-hyuga/adult', 'naruto/sakura-haruno/adult', 'naruto/ino-yamanaka/adult', 'naruto/temari/adult',
  'naruto/tenten/adult', 'naruto/konan/angel', 'naruto/mei-terumi', 'naruto/kushina-uzumaki/adult', 'naruto/kurenai-yuhi', 'naruto/anko-mitarashi',
  'naruto/karin', 'naruto/shizune/adult', 'naruto/kaguya-otsutsuki', 'naruto/kurotsuchi/adult', 'naruto/yugito-nii',
  'bleach/yoruichi-shihoin', 'bleach/rukia-kuchiki/bankai', 'bleach/orihime-inoue', 'bleach/rangiku-matsumoto', 'bleach/tier-harribel',
  'bleach/nelliel-tu-odelschwanck/adult', 'bleach/retsu-unohana', 'bleach/soi-fon', 'bleach/nanao-ise', 'bleach/lisa-yadomaru', 'bleach/momo-hinamori',
  'bleach/bambietta-basterbine',
  'jojo/jolyne-cujoh', 'hxh/biscuit-krueger/true',
  'jjk/maki-zenin/awakened', 'jjk/yuki-tsukumo', 'jjk/nobara-kugisaki',
  'csm/makima', 'csm/power', 'csm/reze', 'csm/himeno', 'csm/quanxi', 'csm/asa-mitaka',
  'dandadan/seiko-ayase', 'dxd/rias-gremory', 'dxd/akeno-himejima', 'dxd/xenovia-quarta', 'dxd/rossweisse', 'dxd/kuroka', 'dxd/serafall-leviathan',
  'dxd/sona-sitri', 'dxd/irina-shidou',
];

const HUSBANDOS = [
  'onepiece/roronoa-zoro', 'onepiece/vinsmoke-sanji', 'onepiece/trafalgar-d-water-law', 'onepiece/portgas-d-ace', 'onepiece/shanks',
  'onepiece/sabo/revolutionary', 'onepiece/marco/post-timeskip', 'onepiece/dracule-mihawk', 'onepiece/kuzan', 'onepiece/rob-lucci/post-timeskip',
  'onepiece/charlotte-katakuri', 'onepiece/cavendish', 'onepiece/kozuki-oden/prime', 'onepiece/silvers-rayleigh/prime', 'onepiece/smoker/post-timeskip',
  'naruto/kakashi-hatake', 'naruto/itachi-uchiha', 'naruto/minato-namikaze', 'naruto/sasuke-uchiha/adult', 'naruto/gaara/kazekage',
  'naruto/shisui-uchiha/teen', 'naruto/neji-hyuga/part-2', 'naruto/obito-uchiha/unmasked', 'naruto/madara-uchiha/prime', 'naruto/hashirama-senju',
  'naruto/tobirama-senju/second-hokage', 'naruto/deidara', 'naruto/shikamaru-nara/adult', 'naruto/yamato/captain-yamato',
  'bleach/byakuya-kuchiki', 'bleach/toshiro-hitsugaya/adult', 'bleach/ulquiorra-cifer', 'bleach/grimmjow-jaegerjaquez', 'bleach/kisuke-urahara',
  'bleach/shunsui-kyoraku', 'bleach/sosuke-aizen', 'bleach/gin-ichimaru', 'bleach/shinji-hirako', 'bleach/coyote-starrk', 'bleach/jushiro-ukitake',
  'jojo/jotaro-kujo/part3', 'jojo/giorno-giovanna', 'jojo/bruno-bucciarati', 'jojo/joseph-joestar/young', 'jojo/caesar-anthonio-zeppeli',
  'jojo/gyro-zeppeli', 'jojo/noriaki-kakyoin',
  'hxh/hisoka-morow', 'hxh/chrollo-lucilfer', 'hxh/kurapika', 'hxh/illumi-zoldyck', 'hxh/ging-freecss',
  'jjk/satoru-gojou/prime', 'jjk/kento-nanami', 'jjk/touji-fushiguro', 'jjk/suguru-getou', 'jjk/megumi-fushiguro', 'jjk/yuuta-okkotsu/shinjuku',
  'jjk/choso', 'jjk/ryoumen-sukuna/heian',
  'csm/aki-hayakawa', 'csm/kishibe', 'csm/angel-devil', 'dxd/yuuto-kiba', 'dxd/vali-lucifer', 'dxd/sirzechs-lucifer',
];

const KAGES = [
  'naruto/hashirama-senju/first-hokage', 'naruto/tobirama-senju/second-hokage', 'naruto/hiruzen-sarutobi/third-hokage',
  'naruto/minato-namikaze/fourth-hokage', 'naruto/tsunade/fifth-hokage', 'naruto/kakashi-hatake/hokage', 'naruto/naruto-uzumaki/adult-hokage',
  'naruto/danzo-shimura/hokage', 'naruto/gaara/kazekage', 'naruto/rasa/fourth-kazekage', 'naruto/a-fourth-raikage/fourth-raikage',
  'naruto/third-raikage', 'naruto/darui', 'naruto/onoki/third-tsuchikage', 'naruto/mu', 'naruto/kurotsuchi/adult', 'naruto/mei-terumi',
  'naruto/yagura-karatachi/fourth-mizukage', 'naruto/gengetsu-hozuki', 'naruto/chojuro/sixth-mizukage',
];

const AKATSUKI = [
  'naruto/itachi-uchiha/akatsuki', 'naruto/kisame-hoshigaki/akatsuki', 'naruto/deidara', 'naruto/sasori/true-form', 'naruto/hidan/akatsuki',
  'naruto/kakuzu/akatsuki', 'naruto/pain/six-paths-of-pain', 'naruto/konan/angel', 'naruto/obito-uchiha/masked-man', 'naruto/zetsu/white',
  'naruto/zetsu/black', 'naruto/orochimaru/akatsuki', 'naruto/nagato-uzumaki/akatsuki-leader', 'naruto/yahiko',
];

const UCHIHA = [
  'naruto/sasuke-uchiha/part-2', 'naruto/itachi-uchiha', 'naruto/madara-uchiha/prime', 'naruto/obito-uchiha/unmasked', 'naruto/shisui-uchiha/teen',
  'naruto/izuna-uchiha', 'naruto/kagami-uchiha', 'naruto/sarada-uchiha/genin', 'naruto/shin-uchiha', 'naruto/indra-otsutsuki/young',
];

const TAILED_BEASTS = [
  'naruto/shukaku', 'naruto/matatabi', 'naruto/isobu', 'naruto/son-goku', 'naruto/kokuo', 'naruto/saiken', 'naruto/chomei', 'naruto/gyuki',
  'naruto/kurama/nine-tails', 'naruto/ten-tails',
];

const STRAW_HATS = [
  'onepiece/monkey-d-luffy/post-timeskip', 'onepiece/roronoa-zoro', 'onepiece/nami', 'onepiece/usopp', 'onepiece/vinsmoke-sanji',
  'onepiece/tony-tony-chopper/post-timeskip', 'onepiece/nico-robin/post-timeskip', 'onepiece/franky/post-timeskip', 'onepiece/brook/post-timeskip',
  'onepiece/jinbe/straw-hat',
];

const SEA_KINGS = [
  'onepiece/edward-newgate', 'onepiece/shanks', 'onepiece/kaido', 'onepiece/charlotte-linlin', 'onepiece/marshall-d-teach',
  'onepiece/buggy', 'onepiece/monkey-d-luffy/gear-5', 'onepiece/sakazuki', 'onepiece/borsalino', 'onepiece/kuzan', 'onepiece/fujitora',
  'onepiece/ryokugyu', 'onepiece/monkey-d-garp', 'onepiece/sengoku', 'onepiece/gol-d-roger', 'onepiece/silvers-rayleigh', 'onepiece/dracule-mihawk',
  'onepiece/shiki', 'onepiece/monkey-d-dragon', 'onepiece/imu',
];

const ESPADA = [
  'bleach/coyote-starrk', 'bleach/barragan-louisenbairn', 'bleach/tier-harribel', 'bleach/ulquiorra-cifer', 'bleach/nnoitra-gilga',
  'bleach/grimmjow-jaegerjaquez', 'bleach/szayelaporro-granz', 'bleach/yammy-llargo', 'bleach/nelliel-tu-odelschwanck/adult',
];

const CAPTAINS = [
  'bleach/genryusai-shigekuni-yamamoto', 'bleach/soi-fon', 'bleach/gin-ichimaru', 'bleach/retsu-unohana', 'bleach/sosuke-aizen',
  'bleach/byakuya-kuchiki', 'bleach/sajin-komamura', 'bleach/shunsui-kyoraku', 'bleach/kaname-tosen', 'bleach/toshiro-hitsugaya',
  'bleach/kenpachi-zaraki', 'bleach/mayuri-kurotsuchi', 'bleach/jushiro-ukitake', 'bleach/shinji-hirako', 'bleach/kensei-muguruma',
  'bleach/rojuro-otoribashi', 'bleach/kisuke-urahara', 'bleach/isshin-kurosaki', 'bleach/rukia-kuchiki/bankai',
];

const JOJO_LINEUP = [
  'jojo/jonathan-joestar', 'jojo/joseph-joestar/young', 'jojo/jotaro-kujo/part3', 'jojo/josuke-higashikata', 'jojo/giorno-giovanna',
  'jojo/jolyne-cujoh', 'jojo/johnny-joestar', 'jojo/gyro-zeppeli', 'jojo/dio-brando/the-world', 'jojo/yoshikage-kira', 'jojo/diavolo',
  'jojo/enrico-pucci', 'jojo/funny-valentine', 'jojo/bruno-bucciarati', 'jojo/jean-pierre-polnareff', 'jojo/noriaki-kakyoin',
  'jojo/robert-e-o-speedwagon', 'jojo/rohan-kishibe', 'jojo/kars', 'jojo/wamuu', 'jojo/caesar-anthonio-zeppeli', 'jojo/okuyasu-nijimura',
  'jojo/koichi-hirose', 'jojo/hol-horse', 'jojo/guido-mista', 'jojo/narancia-ghirga',
];

const VILLAINS = [
  'bleach/sosuke-aizen/hogyoku-fusion', 'bleach/yhwach', 'naruto/madara-uchiha/six-paths', 'naruto/kaguya-otsutsuki', 'naruto/pain',
  'naruto/orochimaru', 'naruto/obito-uchiha/ten-tails-jinchuriki', 'naruto/danzo-shimura', 'onepiece/kaido', 'onepiece/charlotte-linlin',
  'onepiece/marshall-d-teach', 'onepiece/donquixote-doflamingo', 'onepiece/sakazuki', 'onepiece/imu', 'onepiece/rob-lucci', 'onepiece/crocodile',
  'onepiece/enel', 'jojo/dio-brando/the-world', 'jojo/yoshikage-kira', 'jojo/diavolo', 'jojo/enrico-pucci', 'jojo/funny-valentine', 'jojo/kars',
  'hxh/meruem', 'hxh/chrollo-lucilfer', 'hxh/neferpitou', 'jjk/ryoumen-sukuna/heian', 'jjk/kenjaku', 'jjk/mahito', 'csm/makima',
  'csm/gun-devil', 'dxd/rizevim-livan-lucifer', 'dxd/cao-cao', 'dandadan/serpo',
];

const PROTAGONISTS = [
  'onepiece/monkey-d-luffy/post-timeskip', 'naruto/naruto-uzumaki/part-2', 'naruto/boruto-uzumaki', 'bleach/ichigo-kurosaki',
  'hxh/gon-freecss/hunter-exam', 'jjk/yuuji-itadori', 'jjk/yuuta-okkotsu', 'csm/denji', 'dandadan/okarun', 'dandadan/momo-ayase',
  'dxd/issei-hyoudou', 'jojo/jonathan-joestar', 'jojo/joseph-joestar/young', 'jojo/jotaro-kujo/part3', 'jojo/josuke-higashikata',
  'jojo/giorno-giovanna', 'jojo/jolyne-cujoh', 'jojo/johnny-joestar',
];

const SENSEIS = [
  'naruto/kakashi-hatake', 'naruto/jiraiya/sannin', 'naruto/might-guy/base', 'naruto/iruka-umino', 'naruto/asuma-sarutobi', 'naruto/kurenai-yuhi',
  'naruto/hiruzen-sarutobi/third-hokage', 'naruto/tsunade', 'naruto/orochimaru', 'naruto/minato-namikaze/jonin', 'naruto/killer-b',
  'naruto/yamato/captain-yamato', 'naruto/ebisu', 'jjk/satoru-gojou/prime', 'jjk/kento-nanami', 'jjk/yuki-tsukumo', 'bleach/kisuke-urahara',
  'bleach/yoruichi-shihoin', 'bleach/genryusai-shigekuni-yamamoto', 'onepiece/silvers-rayleigh/old', 'onepiece/zeff/old', 'onepiece/monkey-d-garp/old',
  'onepiece/dr-kureha', 'onepiece/shimotsuki-koushirou', 'hxh/biscuit-krueger', 'hxh/kite', 'hxh/isaac-netero/old', 'jojo/caesar-anthonio-zeppeli',
  'jojo/joseph-joestar/old', 'csm/kishibe', 'dxd/azazel',
];

const SWORDSMEN = [
  'onepiece/roronoa-zoro', 'onepiece/dracule-mihawk', 'onepiece/shimotsuki-ryuma', 'onepiece/kozuki-oden/prime', 'onepiece/shanks',
  'onepiece/brook/post-timeskip', 'onepiece/fujitora', 'onepiece/charlotte-katakuri', 'onepiece/kin-emon', 'onepiece/tashigi',
  'bleach/ichigo-kurosaki/true-bankai', 'bleach/kenpachi-zaraki', 'bleach/byakuya-kuchiki/bankai', 'bleach/shunsui-kyoraku',
  'bleach/retsu-unohana', 'bleach/genryusai-shigekuni-yamamoto', 'bleach/toshiro-hitsugaya', 'naruto/zabuza-momochi', 'naruto/kisame-hoshigaki',
  'naruto/mifune', 'naruto/sasuke-uchiha/part-2', 'naruto/tobirama-senju', 'jjk/maki-zenin/awakened', 'jjk/touji-fushiguro', 'jjk/yuuta-okkotsu/shinjuku',
  'csm/katana-man', 'dxd/yuuto-kiba', 'dxd/xenovia-quarta', 'jojo/jean-pierre-polnareff',
];

const JINCHURIKI = [
  'naruto/naruto-uzumaki/kurama-mode', 'naruto/gaara/part-1', 'naruto/yugito-nii', 'naruto/yagura-karatachi', 'naruto/roshi', 'naruto/han',
  'naruto/utakata', 'naruto/fuu', 'naruto/killer-b/eight-tails-mode', 'naruto/kushina-uzumaki', 'naruto/obito-uchiha/ten-tails-jinchuriki',
  'naruto/minato-namikaze', 'naruto/himawari-uzumaki/kurama-jinchuriki',
];

const STRONGEST = [
  'onepiece/monkey-d-luffy/gear-5', 'onepiece/kaido', 'onepiece/edward-newgate/prime', 'onepiece/shanks', 'onepiece/gol-d-roger',
  'onepiece/monkey-d-garp/prime', 'naruto/naruto-uzumaki/six-paths-sage', 'naruto/sasuke-uchiha/rinnegan', 'naruto/madara-uchiha/six-paths',
  'naruto/kaguya-otsutsuki', 'naruto/hashirama-senju/sage-mode', 'naruto/hagoromo-otsutsuki/sage-of-six-paths', 'bleach/yhwach',
  'bleach/sosuke-aizen/hogyoku-fusion', 'bleach/ichigo-kurosaki/true-bankai', 'bleach/genryusai-shigekuni-yamamoto/bankai',
  'bleach/kenpachi-zaraki/unleashed', 'jojo/enrico-pucci/made-in-heaven', 'jojo/giorno-giovanna/requiem', 'jojo/dio-brando/over-heaven',
  'hxh/meruem/post-rose', 'hxh/isaac-netero/prime', 'jjk/satoru-gojou/prime', 'jjk/ryoumen-sukuna/heian', 'csm/pochita',
  'dxd/ophis', 'dxd/great-red', 'dxd/issei-hyoudou/dragon-deification',
];

const PHANTOM_AND_FRIENDS = [
  'hxh/gon-freecss', 'hxh/gon-freecss/adult', 'hxh/killua-zoldyck', 'hxh/killua-zoldyck/godspeed', 'hxh/kurapika', 'hxh/kurapika/emperor-time',
  'hxh/leorio-paradinight', 'hxh/hisoka-morow', 'hxh/chrollo-lucilfer', 'hxh/feitan-portor', 'hxh/uvogin', 'hxh/meruem', 'hxh/neferpitou',
  'hxh/menthuthuyoupi', 'hxh/shaiapouf', 'hxh/isaac-netero', 'hxh/zeno-zoldyck', 'hxh/silva-zoldyck', 'hxh/illumi-zoldyck', 'hxh/biscuit-krueger',
  'hxh/knuckle-bine', 'hxh/kite', 'hxh/ging-freecss', 'hxh/tonpa', 'hxh/morel-mackernasey', 'hxh/pokkle',
];

const JJK_CAST = [
  'jjk/satoru-gojou', 'jjk/ryoumen-sukuna', 'jjk/yuuji-itadori', 'jjk/megumi-fushiguro', 'jjk/nobara-kugisaki', 'jjk/touji-fushiguro',
  'jjk/yuuta-okkotsu', 'jjk/suguru-getou', 'jjk/kenjaku', 'jjk/mahito', 'jjk/jogo', 'jjk/hanami', 'jjk/kento-nanami', 'jjk/aoi-toudou',
  'jjk/maki-zenin', 'jjk/kinji-hakari', 'jjk/yuki-tsukumo', 'jjk/choso', 'jjk/panda', 'jjk/uraume', 'jjk/toge-inumaki', 'jjk/hajime-kashimo',
  'jjk/naoya-zenin', 'jjk/kiyotaka-ijichi', 'jjk/junpei-yoshino',
];

const CSM_CAST = [
  'csm/denji', 'csm/denji/chainsaw-man', 'csm/makima', 'csm/power', 'csm/aki-hayakawa', 'csm/reze', 'csm/kishibe', 'csm/himeno', 'csm/angel-devil',
  'csm/quanxi', 'csm/katana-man', 'csm/kobeni', 'csm/asa-mitaka', 'csm/asa-mitaka/war-devil', 'csm/pochita', 'csm/gun-devil', 'csm/darkness-devil',
  'csm/fami', 'csm/nayuta', 'csm/beam', 'csm/yoshida-hirofumi',
];

const MASCOTS = [
  'onepiece/tony-tony-chopper', 'onepiece/laboon', 'onepiece/pappug', 'onepiece/carrot', 'onepiece/wanda', 'onepiece/inuarashi', 'onepiece/pedro',
  'onepiece/hatchan', 'onepiece/den', 'naruto/akamaru', 'naruto/pakkun', 'naruto/gamabunta', 'naruto/gamakichi', 'naruto/tonton', 'naruto/katsuyu',
  'naruto/manda', 'naruto/kurama/young', 'naruto/shukaku', 'naruto/matatabi', 'bleach/kon', 'bleach/sajin-komamura', 'jjk/panda', 'csm/pochita',
  'csm/beam', 'dandadan/turbo-granny', 'dandadan/serpo', 'dandadan/evil-eye',
];

export const TIER_CATEGORIES: TierCategory[] = [
  { id: 'waifu', name: 'Waifu Material', emoji: '💘', color: '#ff5fa2', prompt: 'Who would make the best wife?', blurb: 'The girls of every anime. Choose wisely.', picks: WAIFUS },
  { id: 'husbando', name: 'Husbando Material', emoji: '🌹', color: '#c77dff', prompt: 'Who would make the best husband?', blurb: 'The men of every anime, ranked by heart.', picks: HUSBANDOS },
  { id: 'kage', name: 'The Kage', emoji: '🏯', color: '#f77f00', prompt: 'Rank every Kage', blurb: 'Hokage, Kazekage, Raikage, Tsuchikage, Mizukage.', picks: KAGES },
  { id: 'akatsuki', name: 'Akatsuki', emoji: '☁️', color: '#e63946', prompt: 'Rank the Akatsuki', blurb: 'Red clouds, black cloaks, questionable plans.', picks: AKATSUKI },
  { id: 'uchiha', name: 'Uchiha Clan', emoji: '👁️', color: '#ff595e', prompt: 'Rank the Uchiha', blurb: 'Sharingan, trauma and fireballs.', picks: UCHIHA },
  { id: 'tailed-beasts', name: 'Tailed Beasts', emoji: '🦊', color: '#ff9f1c', prompt: 'Rank the Tailed Beasts', blurb: 'One through Ten. Who is the coolest?', picks: TAILED_BEASTS },
  { id: 'jinchuriki', name: 'Jinchuriki', emoji: '🌀', color: '#ffb703', prompt: 'Rank the Jinchuriki', blurb: 'Everyone who carried a beast inside.', picks: JINCHURIKI },
  { id: 'straw-hats', name: 'Straw Hat Pirates', emoji: '🏴‍☠️', color: '#e63946', prompt: 'Rank the Straw Hat crew', blurb: 'Every crew member of the future Pirate King.', picks: STRAW_HATS },
  { id: 'sea-kings', name: 'Kings of the Sea', emoji: '👑', color: '#ffd60a', prompt: 'Rank the top of the world', blurb: 'Emperors, Admirals and legends of One Piece.', picks: SEA_KINGS },
  { id: 'espada', name: 'The Espada', emoji: '💀', color: '#e0e1dd', prompt: 'Rank the Espada', blurb: "Aizen's ten deadliest Arrancar.", picks: ESPADA },
  { id: 'captains', name: 'Gotei 13 Captains', emoji: '⚔️', color: '#4cc9f0', prompt: 'Rank the captains', blurb: 'Every haori-wearing captain of Soul Society.', picks: CAPTAINS },
  { id: 'jojo', name: 'Bizarre Lineup', emoji: '⭐', color: '#b15cff', prompt: 'Rank the JoJo cast', blurb: 'Joestars, Zeppelis and their worst enemies.', picks: JOJO_LINEUP },
  { id: 'hxh', name: 'Hunter Association', emoji: '🃏', color: '#80ed99', prompt: 'Rank the Hunter x Hunter cast', blurb: 'Hunters, Troupe members and Chimera Ants.', picks: PHANTOM_AND_FRIENDS },
  { id: 'jjk', name: 'Cursed Lineup', emoji: '🤞', color: '#9d6bff', prompt: 'Rank the Jujutsu Kaisen cast', blurb: 'Sorcerers and curses alike.', picks: JJK_CAST },
  { id: 'csm', name: 'Public Safety', emoji: '🪚', color: '#ff7b00', prompt: 'Rank the Chainsaw Man cast', blurb: 'Devil hunters, fiends and devils.', picks: CSM_CAST },
  { id: 'villains', name: 'Ultimate Villains', emoji: '😈', color: '#e5383b', prompt: 'Who is the best villain?', blurb: 'The bad guys every anime is built around.', picks: VILLAINS },
  { id: 'protagonists', name: 'Main Characters', emoji: '🌟', color: '#ffd60a', prompt: 'Who is the best protagonist?', blurb: 'The heroes with plot armour.', picks: PROTAGONISTS },
  { id: 'senseis', name: 'Best Sensei', emoji: '🍎', color: '#2ec4b6', prompt: 'Who would you want as a teacher?', blurb: 'Mentors, masters and terrible role models.', picks: SENSEIS },
  { id: 'swordsmen', name: 'Blade Masters', emoji: '🗡️', color: '#adb5bd', prompt: 'Who is the best swordsman?', blurb: 'Every anime has someone with a sharp stick.', picks: SWORDSMEN },
  { id: 'strongest', name: 'Power Scaling', emoji: '💥', color: '#ff3d5a', prompt: 'Who is the strongest?', blurb: 'Final forms only. Start the argument.', picks: STRONGEST },
  { id: 'mascots', name: 'Pets & Mascots', emoji: '🐾', color: '#ffafcc', prompt: 'Who is the best little guy?', blurb: 'Animals, toads, plushies and Pochita.', picks: MASCOTS },
  { id: 'zombie', name: 'Zombie Apocalypse', emoji: '🧟', color: '#6a994e', prompt: 'Who survives the zombie apocalypse?', blurb: 'Same faces, one question: who makes it out alive?', picks: ICONIC },
  { id: 'roommate', name: 'Dream Roommate', emoji: '🏠', color: '#90e0ef', prompt: 'Who would you want as a roommate?', blurb: 'Rent is split. Chores are not.', picks: ICONIC },
  { id: 'betrayal', name: 'Most Likely to Betray You', emoji: '🔪', color: '#6c757d', prompt: 'Who would stab you in the back?', blurb: 'S tier means "watch your back".', picks: ICONIC },
  { id: 'design', name: 'Best Character Design', emoji: '🎨', color: '#f72585', prompt: 'Who has the best design?', blurb: 'Outfits, hair and drip.', picks: ICONIC },
  { id: 'aura', name: 'Aura Check', emoji: '🗿', color: '#4361ee', prompt: 'Who has the most aura?', blurb: 'Pure presence. No power scaling allowed.', picks: ICONIC },
];

export const TIER_CATEGORY_BY_ID: Record<string, TierCategory> = Object.fromEntries(TIER_CATEGORIES.map((c) => [c.id, c]));

const BY_KEY = new Map(BUILTIN_ENTRIES.map((e) => [e.key, e]));
const FIRST_FORM = new Map<string, Entry>();
for (const e of BUILTIN_ENTRIES) {
  const charKey = e.key.split('/').slice(0, 2).join('/');
  if (!FIRST_FORM.has(charKey)) FIRST_FORM.set(charKey, e);
}

/** Resolves a pick ("anime/char" or "anime/char/variant") to an entry. */
export function resolvePick(pick: string): Entry | undefined {
  return pick.split('/').length === 3 ? BY_KEY.get(pick) : FIRST_FORM.get(pick);
}

/** Entry keys a category can deal, without duplicates. */
export function categoryKeys(category: TierCategory): string[] {
  return [...new Set(category.picks.map((p) => resolvePick(p)?.key).filter((k): k is string => !!k))];
}

export function tierEntry(key: string): Entry | undefined {
  return BY_KEY.get(key);
}

export function topicOf(category: TierCategory): TierTopic {
  const { id, name, emoji, prompt, color } = category;
  return { id, name, emoji, prompt, color };
}

/** The chosen category, or a random one that differs from the last one played. */
export function pickTierCategory(choice: string | undefined, previousId?: string, rand: () => number = Math.random): TierCategory {
  if (choice && choice !== 'random' && TIER_CATEGORY_BY_ID[choice]) return TIER_CATEGORY_BY_ID[choice];
  const options = TIER_CATEGORIES.filter((c) => c.id !== previousId);
  return options[Math.floor(rand() * options.length)] ?? TIER_CATEGORIES[0];
}
