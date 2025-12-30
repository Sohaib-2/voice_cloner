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
  { code: "en", name: "English", flag: "🇺🇸", isEnglish: true, previewText: "Experience the next generation of voice synthesis. Clone your voice in seconds to create a digital twin with pure, organic sound." },
  { code: "ar", name: "Arabic", flag: "🇸🇦", previewText: "اكتشف الجيل القادم من تركيب الصوت. انسخ صوتك في ثوانٍ لإنشاء نسخة رقمية بصوت عضوي نقي." },
  { code: "da", name: "Danish", flag: "🇩🇰", previewText: "Oplev næste generation af stemmesyntese. Klon din stemme på få sekunder for at skabe en digital tvilling med ren, organisk lyd." },
  { code: "de", name: "German", flag: "🇩🇪", previewText: "Erleben Sie die nächste Generation der Sprachsynthese. Klonen Sie Ihre Stimme in Sekunden, um einen digitalen Zwilling mit reinem, organischem Klang zu erstellen." },
  { code: "el", name: "Greek", flag: "🇬🇷", previewText: "Ανακαλύψτε την επόμενη γενιά σύνθεσης φωνής. Κλωνοποιήστε τη φωνή σας σε δευτερόλεπτα για να δημιουργήσετε έναν ψηφιακό δίδυμο με καθαρό, οργανικό ήχο." },
  { code: "es", name: "Spanish", flag: "🇪🇸", previewText: "Experimenta la próxima generación de síntesis de voz. Clona tu voz en segundos para crear un gemelo digital con sonido puro y orgánico." },
  { code: "fi", name: "Finnish", flag: "🇫🇮", previewText: "Koe seuraavan sukupolven äänisynteesi. Kloonaa äänesi sekunneissa luodaksesi digitaalisen kaksosen puhtaalla, orgaanisella äänellä." },
  { code: "fr", name: "French", flag: "🇫🇷", previewText: "Découvrez la prochaine génération de synthèse vocale. Clonez votre voix en quelques secondes pour créer un jumeau numérique au son pur et organique." },
  { code: "he", name: "Hebrew", flag: "🇮🇱", previewText: "חווה את הדור הבא של סינתזת קול. שכפל את הקול שלך בשניות כדי ליצור תאום דיגיטלי עם צליל טהור ואורגני." },
  { code: "hi", name: "Hindi", flag: "🇮🇳", previewText: "वॉयस सिंथेसिस की अगली पीढ़ी का अनुभव करें। शुद्ध, जैविक ध्वनि के साथ डिजिटल जुड़वां बनाने के लिए सेकंडों में अपनी आवाज़ का क्लोन बनाएं।" },
  { code: "it", name: "Italian", flag: "🇮🇹", previewText: "Sperimenta la prossima generazione di sintesi vocale. Clona la tua voce in pochi secondi per creare un gemello digitale con suono puro e organico." },
  { code: "ja", name: "Japanese", flag: "🇯🇵", previewText: "次世代の音声合成を体験してください。数秒であなたの声をクローンし、純粋でオーガニックなサウンドのデジタルツインを作成します。" },
  { code: "ko", name: "Korean", flag: "🇰🇷", previewText: "차세대 음성 합성을 경험하세요. 몇 초 만에 당신의 목소리를 복제하여 순수하고 유기적인 사운드의 디지털 트윈을 만드세요." },
  { code: "ms", name: "Malay", flag: "🇲🇾", previewText: "Alami generasi seterusnya sintesis suara. Klon suara anda dalam beberapa saat untuk mencipta kembar digital dengan bunyi tulen dan organik." },
  { code: "nl", name: "Dutch", flag: "🇳🇱", previewText: "Ervaar de volgende generatie spraaksynthese. Kloon je stem in seconden om een digitale tweeling te creëren met pure, organische klank." },
  { code: "no", name: "Norwegian", flag: "🇳🇴", previewText: "Opplev neste generasjon talesyntese. Klon stemmen din på sekunder for å skape en digital tvilling med ren, organisk lyd." },
  { code: "pl", name: "Polish", flag: "🇵🇱", previewText: "Doświadcz następnej generacji syntezy mowy. Sklonuj swój głos w ciągu kilku sekund, aby stworzyć cyfrowego bliźniaka z czystym, organicznym dźwiękiem." },
  { code: "pt", name: "Portuguese", flag: "🇵🇹", previewText: "Experimente a próxima geração de síntese de voz. Clone sua voz em segundos para criar um gêmeo digital com som puro e orgânico." },
  { code: "ru", name: "Russian", flag: "🇷🇺", previewText: "Испытайте следующее поколение синтеза голоса. Клонируйте свой голос за секунды, чтобы создать цифрового двойника с чистым, органичным звуком." },
  { code: "sv", name: "Swedish", flag: "🇸🇪", previewText: "Upplev nästa generation av talsyntes. Klona din röst på några sekunder för att skapa en digital tvilling med rent, organiskt ljud." },
  { code: "sw", name: "Swahili", flag: "🇰🇪", previewText: "Pata uzoefu wa kizazi kijacho cha usanidi wa sauti. Nakili sauti yako kwa sekunde ili kuunda pacha ya dijiti yenye sauti safi na asili." },
  { code: "tr", name: "Turkish", flag: "🇹🇷", previewText: "Yeni nesil ses sentezini deneyimleyin. Saf, organik sesle dijital bir ikiz oluşturmak için sesinizi saniyeler içinde klonlayın." },
  { code: "zh", name: "Chinese", flag: "🇨🇳", previewText: "体验下一代语音合成。在几秒钟内克隆您的声音，创建具有纯净、有机声音的数字双胞胎。" },
];
