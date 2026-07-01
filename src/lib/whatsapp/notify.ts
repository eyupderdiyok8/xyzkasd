// ──────────────────────────────────────────────
// WhatsApp Notification Builder
// ──────────────────────────────────────────────
// Helper functions for building notification messages
// sent via the WAHA-managed WhatsApp session.
// ──────────────────────────────────────────────

/**
 * Generate the reminder message text for a given maintenance situation.
 */
export function buildMaintenanceReminderText(params: {
  customerName: string;
  deviceBrand: string;
  deviceModel: string;
  daysUntilDue: number | null; // null = overdue
  daysOverdue: number | null;
  filterName?: string;
}): string {
  const deviceInfo = `${params.deviceBrand} ${params.deviceModel}`;

  if (params.daysOverdue != null && params.daysOverdue > 0) {
    const part = params.filterName
      ? `${params.filterName} değişim zamanı`
      : 'Bakım zamanı';
    return `Sayın ${params.customerName}, ${deviceInfo} cihazınızın ${part} ${params.daysOverdue} gün önce gelmiştir. Lütfen en kısa sürede servis randevusu alınız.`;
  }

  if (params.daysUntilDue != null) {
    const part = params.filterName
      ? `${params.filterName} değişim zamanı`
      : 'Periyodik bakım';
    return `Sayın ${params.customerName}, ${deviceInfo} cihazınızın ${part} yaklaşmaktadır. Kalan süre: ${params.daysUntilDue} gün. Servis randevunuzu şimdi planlayın.`;
  }

  return `Sayın ${params.customerName}, ${deviceInfo} cihazınızın periyodik bakım zamanı gelmiştir. Servis randevusu için bizimle iletişime geçiniz.`;
}

/**
 * Build the survey invitation message sent after service completion.
 */
export function buildSurveyInvitationText(params: {
  customerName: string;
  companyName: string;
  surveyUrl: string;
}): string {
  return (
    `Sayın ${params.customerName}, servis işleminiz başarıyla tamamlandı. ` +
    `Sizden ricamız, ${params.companyName} olarak verdiğimiz hizmeti değerlendirmenizdir. ` +
    `Aşağıdaki linke tıklayarak memnuniyet anketimize katılabilirsiniz (1-5 puan):\n\n` +
    `${params.surveyUrl}\n\n` +
    `Görüşleriniz bizim için değerli!`
  );
}

/**
 * Build the thank-you + coupon message for high scores (>=4).
 */
export function buildHighScoreThanksText(params: {
  customerName: string;
  couponCode: string;
  discountPct: number;
  googleReviewUrl: string;
}): string {
  return (
    `Sayın ${params.customerName}, değerlendirmeniz için teşekkür ederiz! 🎉\n\n` +
    `Size özel %${params.discountPct} indirim kuponunuz: *${params.couponCode}*\n` +
    `Kuponunuz 90 gün geçerlidir.\n\n` +
    `Ayrıca Google üzerinden de bizi değerlendirebilirsiniz:\n` +
    `${params.googleReviewUrl}\n\n` +
    `İyi günler dileriz!`
  );
}

/**
 * Build the notification message for low scores (<=2).
 */
export function buildLowScoreNotificationText(params: {
  customerName: string;
  ticketNo: string;
  score: number;
  comment?: string;
}): string {
  const commentLine = params.comment
    ? `\nMüşteri Yorumu: ${params.comment}`
    : '';
  return (
    `⚠️ *DÜŞÜK PUAN BİLDİRİMİ* ⚠️\n\n` +
    `Müşteri: ${params.customerName}\n` +
    `Servis No: ${params.ticketNo}\n` +
    `Puan: ${params.score}/5${commentLine}\n\n` +
    `Bu servis kaydı acilen incelenmelidir.`
  );
}
