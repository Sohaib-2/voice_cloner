/**
 * Chatterbox Multilingual TTS - Supported Languages
 * 23 languages supported for voice cloning
 * Source: https://www.resemble.ai/introducing-chatterbox-multilingual-open-source-tts-for-23-languages/
 */

export interface Language {
  code: string;
  name: string;
  flag: string;
  isEnglish?: boolean; // Used for routing to F5-TTS
  previewText: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en", name: "English", flag: "🇺🇸", isEnglish: true, previewText: "Your voice holds infinite potential. Transform your vision into reality with pristine clarity and natural emotion that captivates every listener." },
  { code: "ar", name: "Arabic", flag: "🇸🇦", previewText: "صوتك يحمل إمكانات لا حدود لها. حول رؤيتك إلى واقع بوضوح نقي وعاطفة طبيعية تأسر كل مستمع." },
  { code: "da", name: "Danish", flag: "🇩🇰", previewText: "Din stemme rummer uendeligt potentiale. Forvandl din vision til virkelighed med krystalklart lydkvalitet og naturlige følelser der fanger enhver lytter." },
  { code: "de", name: "German", flag: "🇩🇪", previewText: "Ihre Stimme birgt unendliches Potenzial. Verwandeln Sie Ihre Vision in Realität mit makelloser Klarheit und natürlicher Emotion, die jeden Zuhörer fesselt." },
  { code: "el", name: "Greek", flag: "🇬🇷", previewText: "Η φωνή σας κρύβει απεριόριστες δυνατότητες. Μετατρέψτε το όραμά σας σε πραγματικότητα με άψογη διαύγεια και φυσική συγκίνηση που μαγεύει κάθε ακροατή." },
  { code: "es", name: "Spanish", flag: "🇪🇸", previewText: "Tu voz tiene un potencial infinito. Transforma tu visión en realidad con claridad impecable y emoción natural que cautiva a cada oyente." },
  { code: "fi", name: "Finnish", flag: "🇫🇮", previewText: "Äänesi sisältää rajattoman potentiaalin. Muuta visiosi todellisuudeksi kristallinkirkkaalla äänellä ja luonnollisella tunteella joka vangitsee jokaisen kuulijan." },
  { code: "fr", name: "French", flag: "🇫🇷", previewText: "Votre voix recèle un potentiel infini. Transformez votre vision en réalité avec une clarté impeccable et une émotion naturelle qui captive chaque auditeur." },
  { code: "he", name: "Hebrew", flag: "🇮🇱", previewText: "הקול שלך מכיל פוטנציאל אינסופי. הפוך את החזון שלך למציאות עם בהירות מושלמת ורגש טבעי שמרתק כל מאזין." },
  { code: "hi", name: "Hindi", flag: "🇮🇳", previewText: "आपकी आवाज़ में असीम संभावनाएं हैं। अपनी दृष्टि को निर्मल स्पष्टता और प्राकृतिक भावना के साथ वास्तविकता में बदलें जो हर श्रोता को मोहित करे।" },
  { code: "it", name: "Italian", flag: "🇮🇹", previewText: "La tua voce racchiude un potenziale infinito. Trasforma la tua visione in realtà con chiarezza cristallina ed emozione naturale che affascina ogni ascoltatore." },
  { code: "ja", name: "Japanese", flag: "🇯🇵", previewText: "あなたの声には無限の可能性があります。透き通った明瞭さと自然な感情で、すべてのリスナーを魅了し、ビジョンを現実に変えましょう。" },
  { code: "ko", name: "Korean", flag: "🇰🇷", previewText: "당신의 목소리는 무한한 잠재력을 지니고 있습니다. 완벽한 명료함과 자연스러운 감정으로 모든 청취자를 사로잡으며 비전을 현실로 바꾸세요." },
  { code: "ms", name: "Malay", flag: "🇲🇾", previewText: "Suara anda mempunyai potensi yang tidak terhingga. Ubah visi anda menjadi realiti dengan kejelasan sempurna dan emosi semula jadi yang memikat setiap pendengar." },
  { code: "nl", name: "Dutch", flag: "🇳🇱", previewText: "Je stem bevat oneindig potentieel. Transform je visie naar werkelijkheid met onberispelijke helderheid en natuurlijke emotie die elke luisteraar boeit." },
  { code: "no", name: "Norwegian", flag: "🇳🇴", previewText: "Din stemme rommer ubegrenset potensial. Forvandl din visjon til virkelighet med krystallklar klarhet og naturlig følelse som fanger hver lytter." },
  { code: "pl", name: "Polish", flag: "🇵🇱", previewText: "Twój głos kryje nieskończony potencjał. Przekształć swoją wizję w rzeczywistość z nieskazitelną czystością i naturalną emocją, która zachwyca każdego słuchacza." },
  { code: "pt", name: "Portuguese", flag: "🇵🇹", previewText: "Sua voz possui potencial infinito. Transforme sua visão em realidade com clareza impecável e emoção natural que cativa cada ouvinte." },
  { code: "ru", name: "Russian", flag: "🇷🇺", previewText: "Ваш голос обладает безграничным потенциалом. Превратите ваше видение в реальность с безупречной ясностью и естественной эмоцией, которая пленяет каждого слушателя." },
  { code: "sv", name: "Swedish", flag: "🇸🇪", previewText: "Din röst rymmer oändlig potential. Förvandla din vision till verklighet med kristallklar klarhet och naturlig känsla som fängslar varje lyssnare." },
  { code: "sw", name: "Swahili", flag: "🇰🇪", previewText: "Sauti yako ina uwezo usio na kikomo. Badilisha maono yako kuwa ukweli kwa uwazi kamili na hisia asili zinazovutia kila msikilizaji." },
  { code: "tr", name: "Turkish", flag: "🇹🇷", previewText: "Sesiniz sonsuz potansiyele sahip. Vizyonunuzu kusursuz netlik ve her dinleyiciyi büyüleyen doğal duyguyla gerçeğe dönüştürün." },
  { code: "zh", name: "Chinese", flag: "🇨🇳", previewText: "您的声音蕴含无限潜力。用完美的清晰度和自然的情感将您的愿景转化为现实，吸引每一位听众。" },
];
