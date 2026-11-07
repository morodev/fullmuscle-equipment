import assert from 'node:assert/strict';
import test from 'node:test';
import { parseShowroomHours } from '../../src/lib/showroom-hours';
import { validateReleaseConfig } from './release-config';
import { isLocalQuoteTestMode } from '../../src/lib/quote-test-mode';

test('gli orari italiani con pausa generano due intervalli validi per Google', () => {
  const hours = parseShowroomHours('Lun-Ven 09:00-13:00,14:00-18:00; Sab 09:00-12:00');
  assert.equal(hours?.length, 3);
  assert.deepEqual(hours?.[0]?.dayOfWeek, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => `https://schema.org/${day}`));
  assert.equal(hours?.[1]?.opens, '14:00');
  assert.equal(hours?.[2]?.closes, '12:00');
  assert.deepEqual(hours?.[2]?.dayOfWeek, ['https://schema.org/Saturday']);
});

test('gli orari supportano abbreviazioni inglesi e intervalli a cavallo della settimana', () => {
  assert.deepEqual(parseShowroomHours('Su-Mo 22:00-02:00')?.[0]?.dayOfWeek, ['https://schema.org/Sunday', 'https://schema.org/Monday']);
  assert.equal(parseShowroomHours('Mo-Fr 09:00-18:00')?.[0]?.closes, '18:00');
});

test('gli orari incompleti o ambigui non producono dati strutturati inventati', () => {
  for (const value of ['', 'Su appuntamento', 'Lun 25:00-28:00', 'Lun 09:60-18:00', 'Lun 09:00-09:00', 'Lun-Ven 09:00-13:00; Sab da confermare']) {
    assert.equal(parseShowroomHours(value), undefined, value);
  }
});

const validConfig = {
  PUBLIC_SITE_READY: 'true', PUBLIC_SITE_URL: 'https://fullmuscle-equipment.com',
  COMPANY_LEGAL_NAME: 'Example Company', COMPANY_VAT: '12345678901', COMPANY_ADDRESS: 'Example street 1', COMPANY_CITY: 'Roma',
  COMPANY_EMAIL: 'info@example.com', COMPANY_PHONE: '+390612345678', COMPANY_SHOWROOM_HOURS: 'Lun-Ven 09:00-13:00,14:00-18:00',
  PUBLIC_TURNSTILE_SITE_KEY: 'test-site-key', TURNSTILE_SECRET_KEY: 'test-secret-key',
  SMTP_HOST: 'smtp.example.com', SMTP_USER: 'info@example.com', SMTP_PASSWORD: 'test-password', QUOTE_TO_EMAIL: 'sales@example.com', QUOTE_FROM_EMAIL: 'info@example.com',
};

test('la release blocca la privacy ancora in bozza anche quando le variabili sono presenti', () => {
  assert.deepEqual(validateReleaseConfig(validConfig, '<p>Informativa definitiva.</p>'), []);
  assert.match(validateReleaseConfig(validConfig, '<p>Il testo definitivo sarà verificato e completato.</p>').join('\n'), /Privacy/);
});

test('la release segnala recapiti, dominio e trasporto non validi senza esporre i valori', () => {
  const errors = validateReleaseConfig({ ...validConfig, PUBLIC_SITE_URL: 'https://fullmuscle-equipment.com/?preview=1', QUOTE_TO_EMAIL: 'invalid-recipient', SMTP_PORT: '70000', SMTP_SECURE: 'yes' }, 'Final');
  assert.equal(errors.length, 4);
  assert.match(errors.join('\n'), /PUBLIC_SITE_URL/);
  assert.match(errors.join('\n'), /QUOTE_TO_EMAIL/);
  assert.match(errors.join('\n'), /SMTP_PORT/);
  assert.match(errors.join('\n'), /SMTP_SECURE/);
  assert.doesNotMatch(errors.join('\n'), /invalid-recipient|test-password|test-secret/);
});

test('la release resta bloccata senza antispam, destinatario e stato pronto', () => {
  const errors = validateReleaseConfig({ ...validConfig, PUBLIC_SITE_READY: 'false', TURNSTILE_SECRET_KEY: '', QUOTE_TO_EMAIL: '' }, 'Final');
  assert.ok(errors.includes('PUBLIC_SITE_READY=true'));
  assert.ok(errors.includes('TURNSTILE_SECRET_KEY'));
  assert.ok(errors.includes('QUOTE_TO_EMAIL'));
});

test('la simulazione dei preventivi richiede tutti i segnali del test locale', () => {
  const testEnv = { HOST: '127.0.0.1', NODE_ENV: 'test', FULLMUSCLE_QUOTE_TEST_MODE: 'true' };
  assert.equal(isLocalQuoteTestMode(testEnv), true);
  assert.equal(isLocalQuoteTestMode({ ...testEnv, FULLMUSCLE_QUOTE_TEST_MODE: '' }), false);
  assert.equal(isLocalQuoteTestMode({ ...testEnv, NODE_ENV: 'production' }), false);
  assert.equal(isLocalQuoteTestMode({ ...testEnv, HOST: '0.0.0.0' }), false);
  assert.equal(isLocalQuoteTestMode({ PUBLIC_SITE_READY: 'false' }), false);
});
