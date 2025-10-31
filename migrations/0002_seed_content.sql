-- Seed vocabulary (120 essential words across themes and levels)

-- A0 Level - Housing theme
INSERT INTO vocabulary (word, translation, level, theme, example_sentence) VALUES
('das Haus', 'house', 'A0', 'housing', 'Das Haus ist groß.'),
('die Wohnung', 'apartment', 'A0', 'housing', 'Die Wohnung hat drei Zimmer.'),
('das Zimmer', 'room', 'A0', 'housing', 'Mein Zimmer ist klein.'),
('die Küche', 'kitchen', 'A0', 'housing', 'Die Küche ist modern.'),
('das Bad', 'bathroom', 'A0', 'housing', 'Das Bad ist sauber.'),
('die Miete', 'rent', 'A0', 'housing', 'Die Miete kostet 1200 Franken.'),
('der Schlüssel', 'key', 'A0', 'housing', 'Wo ist der Schlüssel?');

-- A0 Level - Transport theme
INSERT INTO vocabulary (word, translation, level, theme, example_sentence) VALUES
('der Bus', 'bus', 'A0', 'transport', 'Der Bus kommt um 10 Uhr.'),
('die Bahn', 'train', 'A0', 'transport', 'Die Bahn fährt nach Zürich.'),
('das Tram', 'tram', 'A0', 'transport', 'Das Tram ist pünktlich.'),
('das Ticket', 'ticket', 'A0', 'transport', 'Ich kaufe ein Ticket.'),
('der Bahnhof', 'train station', 'A0', 'transport', 'Der Bahnhof ist groß.'),
('die Haltestelle', 'stop', 'A0', 'transport', 'Die Haltestelle ist dort.');

-- A0 Level - Shopping theme
INSERT INTO vocabulary (word, translation, level, theme, example_sentence) VALUES
('der Laden', 'shop', 'A0', 'shopping', 'Der Laden ist offen.'),
('der Supermarkt', 'supermarket', 'A0', 'shopping', 'Ich gehe zum Supermarkt.'),
('das Geld', 'money', 'A0', 'shopping', 'Ich brauche Geld.'),
('der Franken', 'Swiss franc', 'A0', 'shopping', 'Das kostet zehn Franken.'),
('kaufen', 'to buy', 'A0', 'shopping', 'Ich kaufe Brot.');

-- A1 Level - Doctor theme
INSERT INTO vocabulary (word, translation, level, theme, example_sentence) VALUES
('der Arzt', 'doctor', 'A1', 'doctor', 'Ich gehe zum Arzt.'),
('die Apotheke', 'pharmacy', 'A1', 'doctor', 'Die Apotheke ist geschlossen.'),
('das Medikament', 'medication', 'A1', 'doctor', 'Ich brauche ein Medikament.'),
('der Termin', 'appointment', 'A1', 'doctor', 'Ich habe einen Termin um 15 Uhr.'),
('krank', 'sick', 'A1', 'doctor', 'Ich bin krank.'),
('die Krankenkasse', 'health insurance', 'A1', 'doctor', 'Meine Krankenkasse heißt Swica.'),
('das Rezept', 'prescription', 'A1', 'doctor', 'Der Arzt gibt mir ein Rezept.');

-- A1 Level - Gemeinde (administration)
INSERT INTO vocabulary (word, translation, level, theme, example_sentence) VALUES
('das Amt', 'office/authority', 'A1', 'gemeinde', 'Ich gehe zum Amt.'),
('das Formular', 'form', 'A1', 'gemeinde', 'Ich fülle das Formular aus.'),
('die Anmeldung', 'registration', 'A1', 'gemeinde', 'Die Anmeldung ist wichtig.'),
('die Adresse', 'address', 'A1', 'gemeinde', 'Meine Adresse ist Bahnhofstrasse 10.'),
('der Pass', 'passport', 'A1', 'gemeinde', 'Ich brauche meinen Pass.'),
('der Ausweis', 'ID card', 'A1', 'gemeinde', 'Zeigen Sie bitte Ihren Ausweis.');

-- A2 Level - Work theme
INSERT INTO vocabulary (word, translation, level, theme, example_sentence) VALUES
('die Arbeit', 'work', 'A2', 'work', 'Die Arbeit beginnt um 8 Uhr.'),
('der Kollege', 'colleague', 'A2', 'work', 'Mein Kollege heißt Thomas.'),
('die Besprechung', 'meeting', 'A2', 'work', 'Die Besprechung dauert zwei Stunden.'),
('der Chef', 'boss', 'A2', 'work', 'Der Chef ist heute nicht da.'),
('die Pause', 'break', 'A2', 'work', 'Ich mache eine Pause.'),
('der Urlaub', 'vacation', 'A2', 'work', 'Ich habe drei Wochen Urlaub.');

-- A2 Level - School theme
INSERT INTO vocabulary (word, translation, level, theme, example_sentence) VALUES
('die Schule', 'school', 'A2', 'school', 'Mein Kind geht zur Schule.'),
('der Lehrer', 'teacher', 'A2', 'school', 'Der Lehrer ist sehr nett.'),
('der Unterricht', 'lesson/class', 'A2', 'school', 'Der Unterricht beginnt um 8 Uhr.'),
('die Hausaufgabe', 'homework', 'A2', 'school', 'Die Hausaufgaben sind schwer.'),
('die Prüfung', 'exam', 'A2', 'school', 'Die Prüfung ist nächste Woche.'),
('das Zeugnis', 'report card', 'A2', 'school', 'Das Zeugnis kommt im Juli.');

-- B1 Level - Housing (advanced)
INSERT INTO vocabulary (word, translation, level, theme, example_sentence) VALUES
('der Mietvertrag', 'rental contract', 'B1', 'housing', 'Ich unterschreibe den Mietvertrag morgen.'),
('die Kaution', 'deposit', 'B1', 'housing', 'Die Kaution beträgt zwei Monatsmieten.'),
('die Nebenkosten', 'additional costs', 'B1', 'housing', 'Die Nebenkosten sind im Preis enthalten.'),
('kündigen', 'to cancel/terminate', 'B1', 'housing', 'Ich möchte den Vertrag kündigen.'),
('die Renovierung', 'renovation', 'B1', 'housing', 'Die Renovierung kostet viel Geld.');

-- B1 Level - Work (advanced)
INSERT INTO vocabulary (word, translation, level, theme, example_sentence) VALUES
('die Bewerbung', 'application', 'B1', 'work', 'Ich schicke meine Bewerbung heute ab.'),
('der Lebenslauf', 'CV/resume', 'B1', 'work', 'Mein Lebenslauf ist aktuell.'),
('das Vorstellungsgespräch', 'job interview', 'B1', 'work', 'Das Vorstellungsgespräch war erfolgreich.'),
('die Kündigung', 'resignation/termination', 'B1', 'work', 'Ich habe die Kündigung erhalten.'),
('die Sozialversicherung', 'social insurance', 'B1', 'work', 'Die Sozialversicherung ist obligatorisch.');

-- B1 Level - Gemeinde (advanced)
INSERT INTO vocabulary (word, translation, level, theme, example_sentence) VALUES
('die Aufenthaltsbewilligung', 'residence permit', 'B1', 'gemeinde', 'Ich beantrage eine Aufenthaltsbewilligung.'),
('die Steuererklärung', 'tax declaration', 'B1', 'gemeinde', 'Die Steuererklärung muss bis März eingereicht werden.'),
('der Zivilstand', 'marital status', 'B1', 'gemeinde', 'Mein Zivilstand hat sich geändert.'),
('die Einbürgerung', 'naturalization', 'B1', 'gemeinde', 'Die Einbürgerung dauert mehrere Jahre.');

-- Seed strategy tips
INSERT INTO strategy_tips (skill, level, tactic, tip_title, tip_content, example) VALUES
('reading', 'A1', 'skim', 'Skim First, Detail Later', 'Don''t read every word! First, look at the title, headings, and first sentences to understand the main idea. Then read for details.', 'Title: "Öffnungszeiten" → You know it''s about opening hours before reading details.'),
('reading', 'A2', 'scan', 'Scan for Keywords', 'When answering questions, scan the text for specific keywords from the question. Look for numbers, names, dates, and places first.', 'Question: "Wann öffnet der Laden?" → Scan for time expressions like "8:00 Uhr", "Montag", "geöffnet"'),
('reading', 'B1', 'inference', 'Read Between the Lines', 'Sometimes the answer isn''t directly stated. Use context clues and your knowledge to infer meaning. Look for synonyms and paraphrasing.', 'Text: "Der Markt hat seine Türen geschlossen" = The market is closed (even though "geschlossen" isn''t used directly)');

INSERT INTO strategy_tips (skill, level, tactic, tip_title, tip_content, example) VALUES
('listening', 'A1', 'predict', 'Preview and Predict', 'Before listening, read the questions carefully. Predict what kind of information you''ll hear. This helps you focus.', 'Question: "Wie viel kostet das Ticket?" → You know to listen for prices in Franken.'),
('listening', 'A2', 'gist', 'First Pass: Get the Gist', 'On first listening, understand the main idea. Don''t worry about every word. Who? What? Where? When?', 'Announcement about a train delay → Main idea: Train is late, new time is...'),
('listening', 'B1', 'detail', 'Second Pass: Capture Details', 'On second listening, focus on specific information: numbers, dates, reasons, conditions. Write them down quickly.', 'Listen for: departure time (14:15), platform (Gleis 7), reason (technisches Problem)');

INSERT INTO strategy_tips (skill, level, tactic, tip_title, tip_content, example) VALUES
('speaking', 'A1', 'role-play', 'Use TASK Framework', 'Topic: State your purpose. Answer: Give your main response. Support: Add one detail. Keep it tidy: Finish politely.', 'T: "Ich möchte ein Ticket kaufen." A: "Nach Bern, bitte." S: "Einfache Fahrt." K: "Danke schön!"'),
('speaking', 'A2', 'role-play', 'Use Fillers Naturally', 'Use German fillers to sound more natural: "also...", "also dann...", "hmm...", "na ja...". They give you thinking time!', '"Also... ich möchte am Donnerstag einen Termin... also dann... um 10 Uhr vielleicht?"'),
('speaking', 'B1', 'role-play', 'Repair Strategies', 'If you don''t understand, ask for clarification. If you make a mistake, correct yourself naturally.', '"Entschuldigung, können Sie das wiederholen?" or "Ich meine... ich meinte Freitag, nicht Donnerstag."');

INSERT INTO strategy_tips (skill, level, tactic, tip_title, tip_content, example) VALUES
('writing', 'A1', 'paraphrase', 'Use Simple Sentence Frames', 'Build sentences with basic patterns: Subject + Verb + Object. Connect with "und", "aber", "oder".', '"Ich heiße Anna und ich komme aus der Schweiz. Ich wohne in Zürich."'),
('writing', 'A2', 'paraphrase', 'Connect with Conjunctions', 'Use "weil", "wenn", "dass" to make complex sentences. Remember: verb goes to the end after these words!', '"Ich kann nicht kommen, weil ich krank bin." (verb "bin" at end)'),
('writing', 'B1', 'paraphrase', 'Use PEEL Structure', 'Point: Make your main point. Evidence: Give an example. Explain: Say why it matters. Link: Connect to next idea.', 'P: "Die Wohnung ist zu teuer." E: "Die Miete kostet 2000 CHF." Ex: "Das ist mehr als ich verdiene." L: "Deshalb suche ich eine günstigere Wohnung."');

-- Seed content items (50+ practice items across all themes and levels)

-- A0 Reading - Housing
INSERT INTO content_items (type, level, theme, tactic, title, content, difficulty, time_estimate_seconds, source) VALUES
('reading', 'A0', 'housing', 'scan', 'Apartment Ad', '{"text": "Wohnung zu vermieten\n\n2 Zimmer\nKüche, Bad\nMiete: 1200 CHF\nAdresse: Bahnhofstrasse 45, Zürich\n\nTelefon: 044 123 45 67", "question": "Wie viel kostet die Miete?", "options": ["1000 CHF", "1200 CHF", "1400 CHF", "1600 CHF"], "correct_answer": 1, "explanation": "The text clearly states: Miete: 1200 CHF"}', 0.2, 60, 'generated');

INSERT INTO content_items (type, level, theme, tactic, title, content, difficulty, time_estimate_seconds, source) VALUES
('reading', 'A0', 'housing', 'scan', 'Key Pickup Notice', '{"text": "Lieber Mieter,\n\nSie können den Schlüssel am Montag abholen.\nZeit: 10:00 bis 12:00 Uhr\nOrt: Hausverwaltung, Musterweg 3\n\nFreundliche Grüße\nHerr Meier", "question": "Wann kann man den Schlüssel abholen?", "options": ["Sonntag 10-12 Uhr", "Montag 10-12 Uhr", "Dienstag 10-12 Uhr", "Mittwoch 10-12 Uhr"], "correct_answer": 1, "explanation": "The notice says: am Montag... Zeit: 10:00 bis 12:00 Uhr"}', 0.2, 60, 'generated');

-- A0 Reading - Transport
INSERT INTO content_items (type, level, theme, tactic, title, content, difficulty, time_estimate_seconds, source) VALUES
('reading', 'A0', 'transport', 'scan', 'Bus Schedule', '{"text": "Bus Nummer 12\n\nMontag - Freitag\nErste Fahrt: 06:30 Uhr\nLetzte Fahrt: 23:00 Uhr\n\nSamstag - Sonntag\nErste Fahrt: 08:00 Uhr\nLetzte Fahrt: 22:00 Uhr", "question": "Wann fährt der erste Bus am Samstag?", "options": ["06:30", "07:00", "08:00", "09:00"], "correct_answer": 2, "explanation": "Under Samstag-Sonntag: Erste Fahrt: 08:00 Uhr"}', 0.2, 60, 'generated');

-- A0 Listening - Shopping
INSERT INTO content_items (type, level, theme, tactic, title, content, difficulty, time_estimate_seconds, source) VALUES
('listening', 'A0', 'shopping', 'gist', 'At the Bakery', '{"transcript": "Guten Tag! Was möchten Sie?\nIch möchte zwei Brötchen und ein Brot, bitte.\nGerne. Das macht 8 Franken.\nHier, bitte.\nDanke schön. Auf Wiedersehen!", "question": "Was kauft die Person?", "options": ["Ein Brötchen", "Zwei Brötchen und ein Brot", "Nur Brot", "Drei Brötchen"], "correct_answer": 1, "explanation": "The customer says: Ich möchte zwei Brötchen und ein Brot", "audio_prompt": "Dialog at bakery"}', 0.2, 90, 'generated');

-- A1 Reading - Doctor
INSERT INTO content_items (type, level, theme, tactic, title, content, difficulty, time_estimate_seconds, source) VALUES
('reading', 'A1', 'doctor', 'skim', 'Doctor Appointment Card', '{"text": "Praxis Dr. Müller\nAllgemeinmedizin\n\nIhr Termin:\nDatum: 15. März 2024\nUhrzeit: 14:30 Uhr\n\nBitte bringen Sie mit:\n- Krankenkassenkarte\n- Pass oder Ausweis\n- Aktuelles Rezept\n\nBei Verhinderung bitte 24 Stunden vorher absagen.\nTelefon: 044 555 77 88", "question": "Was muss man zum Termin mitbringen?", "options": ["Nur die Krankenkassenkarte", "Pass und Rezept", "Krankenkassenkarte, Ausweis und Rezept", "Nur einen Ausweis"], "correct_answer": 2, "explanation": "The text lists three items under Bitte bringen Sie mit"}', 0.3, 90, 'generated');

-- A1 Reading - Gemeinde
INSERT INTO content_items (type, level, theme, tactic, title, content, difficulty, time_estimate_seconds, source) VALUES
('reading', 'A1', 'gemeinde', 'scan', 'Registration Form Info', '{"text": "Anmeldung beim Einwohneramt\n\nÖffnungszeiten:\nMontag bis Freitag: 08:00 - 12:00 und 14:00 - 17:00\nSamstag: geschlossen\n\nBenötigte Dokumente:\n1. Pass oder Identitätskarte\n2. Mietvertrag\n3. Anmeldeformular (online oder vor Ort)\n\nAdresse: Stadthaus, Rathausplatz 1", "question": "Wann ist das Amt am Nachmittag geöffnet?", "options": ["12:00 - 17:00", "13:00 - 17:00", "14:00 - 17:00", "14:00 - 18:00"], "correct_answer": 2, "explanation": "Text states: 14:00 - 17:00 for afternoon hours"}', 0.3, 90, 'generated');

-- A1 Listening - Transport
INSERT INTO content_items (type, level, theme, tactic, title, content, difficulty, time_estimate_seconds, source) VALUES
('listening', 'A1', 'transport', 'predict', 'Train Announcement', '{"transcript": "Achtung, Achtung! Der Zug nach Bern, Abfahrt 15:45 Uhr, fährt heute von Gleis 7. Ich wiederhole: Gleis 7, nicht Gleis 5. Wir bitten um Entschuldigung für die Änderung.", "question": "Von welchem Gleis fährt der Zug?", "options": ["Gleis 5", "Gleis 6", "Gleis 7", "Gleis 8"], "correct_answer": 2, "explanation": "The announcement clearly states: fährt heute von Gleis 7", "audio_prompt": "Train station announcement"}', 0.3, 90, 'generated');

-- A2 Reading - Work
INSERT INTO content_items (type, level, theme, tactic, title, content, difficulty, time_estimate_seconds, source) VALUES
('reading', 'A2', 'work', 'skim', 'Office Email', '{"text": "Betreff: Besprechung nächste Woche\n\nLiebe Kolleginnen und Kollegen,\n\ndie monatliche Teambesprechung findet am Dienstag, 20. Mai um 10:00 Uhr im Konferenzraum A statt. Die Besprechung dauert circa 90 Minuten.\n\nThemen:\n- Neue Projekte\n- Urlaubsplanung\n- Verschiedenes\n\nBitte bereiten Sie Ihre Projektberichte vor.\n\nMit freundlichen Grüßen\nSandra Weber\nTeamleiterin", "question": "Wie lange dauert die Besprechung?", "options": ["60 Minuten", "90 Minuten", "120 Minuten", "2 Stunden"], "correct_answer": 1, "explanation": "Email states: dauert circa 90 Minuten"}', 0.4, 120, 'generated');

-- A2 Reading - School
INSERT INTO content_items (type, level, theme, tactic, title, content, difficulty, time_estimate_seconds, source) VALUES
('reading', 'A2', 'school', 'scan', 'Parent-Teacher Note', '{"text": "Elternbrief\n\nLiebe Eltern,\n\nam Freitag, 10. Juni findet unser Schulfest statt. Beginn: 15:00 Uhr, Ende: 18:00 Uhr.\n\nDie Kinder sollten mitbringen:\n- Sonnenhut\n- Getränke\n- 5 Franken für Aktivitäten\n\nWir freuen uns auf Ihr Kommen!\n\nFreundliche Grüße\nFrau Schneider, Klassenlehrerin", "question": "Wann beginnt das Schulfest?", "options": ["14:00 Uhr", "15:00 Uhr", "16:00 Uhr", "17:00 Uhr"], "correct_answer": 1, "explanation": "Letter states: Beginn: 15:00 Uhr"}', 0.4, 120, 'generated');

-- A2 Listening - Doctor
INSERT INTO content_items (type, level, theme, tactic, title, content, difficulty, time_estimate_seconds, source) VALUES
('listening', 'A2', 'doctor', 'detail', 'Pharmacy Instructions', '{"transcript": "So, Frau Keller, hier ist Ihr Medikament. Nehmen Sie eine Tablette dreimal täglich - morgens, mittags und abends - immer nach dem Essen. Die Behandlung dauert zehn Tage. Trinken Sie viel Wasser dazu. Haben Sie noch Fragen?", "question": "Wie oft soll man die Tablette nehmen?", "options": ["Einmal täglich", "Zweimal täglich", "Dreimal täglich", "Viermal täglich"], "correct_answer": 2, "explanation": "Pharmacist says: dreimal täglich - morgens, mittags und abends", "audio_prompt": "Pharmacy consultation"}', 0.4, 120, 'generated');

-- B1 Reading - Housing
INSERT INTO content_items (type, level, theme, tactic, title, content, difficulty, time_estimate_seconds, source) VALUES
('reading', 'B1', 'housing', 'inference', 'Rental Contract Termination', '{"text": "Kündigungsschreiben\n\nSehr geehrte Frau Schmidt,\n\nhiermit kündige ich meinen Mietvertrag für die Wohnung an der Seestrasse 23, 8001 Zürich, fristgerecht zum 31. August 2024.\n\nGemäß Mietvertrag beträgt die Kündigungsfrist drei Monate. Da ich dieses Schreiben am 25. Mai versende, endet das Mietverhältnis am letzten Tag im August.\n\nIch bitte um Bestätigung des Kündigungstermins sowie um Informationen zur Wohnungsübergabe und Rückzahlung der Kaution.\n\nMit freundlichen Grüßen\nMartin Weber", "question": "Warum kündigt Herr Weber zum 31. August?", "options": ["Er hat die Kaution verloren", "Die Kündigungsfrist beträgt 3 Monate ab Mai", "Die Wohnung ist zu teuer", "Der Vermieter will es so"], "correct_answer": 1, "explanation": "The text states that the notice period is 3 months, and since the letter is sent in May (25th), the tenancy ends at the end of August. This must be inferred from the two pieces of information.", "strategy_hint": "This requires inference: connect the 3-month notice period with the May sending date to understand the August end date."}', 0.6, 180, 'generated');

-- B1 Reading - Work
INSERT INTO content_items (type, level, theme, tactic, title, content, difficulty, time_estimate_seconds, source) VALUES
('reading', 'B1', 'work', 'inference', 'Job Application Email', '{"text": "Betreff: Ihre Bewerbung als Sachbearbeiter\n\nSehr geehrter Herr Müller,\n\nvielen Dank für Ihre Bewerbung und Ihr Interesse an der Stelle als Sachbearbeiter in unserer Abteilung.\n\nLeider müssen wir Ihnen mitteilen, dass wir uns für einen anderen Kandidaten entschieden haben. Die Entscheidung war nicht einfach, da wir viele qualifizierte Bewerbungen erhalten haben. Ihre Qualifikationen und Ihr Lebenslauf haben uns sehr beeindruckt.\n\nWir wünschen Ihnen für Ihre berufliche Zukunft alles Gute und viel Erfolg bei Ihrer weiteren Jobsuche.\n\nMit freundlichen Grüßen\nPersonalabteilung HR Solutions AG", "question": "Was bedeutet dieser Brief für Herr Müller?", "options": ["Er bekommt die Stelle", "Er soll zum Vorstellungsgespräch kommen", "Er hat die Stelle nicht bekommen", "Er muss mehr Dokumente schicken"], "correct_answer": 2, "explanation": "The polite phrasing wir uns für einen anderen Kandidaten entschieden haben means he did not get the job. This requires understanding polite rejection language.", "strategy_hint": "In formal German, rejections are often softened with polite phrases. Look for key phrases like leider, einen anderen Kandidaten, and wishes for the future."}', 0.6, 180, 'generated');

-- B1 Listening - Gemeinde
INSERT INTO content_items (type, level, theme, tactic, title, content, difficulty, time_estimate_seconds, source) VALUES
('listening', 'B1', 'gemeinde', 'detail', 'Residence Permit Appointment', '{"transcript": "Guten Tag, Einwohneramt, Frau Keller am Apparat. Wie kann ich Ihnen helfen?\nJa, guten Tag. Ich brauche einen Termin für die Verlängerung meiner Aufenthaltsbewilligung.\nGerne. Haben Sie alle Dokumente bereit? Sie brauchen den aktuellen Pass, einen Arbeitsvertrag, eine Wohnsitzbestätigung und drei aktuelle Passfotos.\nJa, alles vorbereitet.\nAusgezeichnet. Wann passt es Ihnen? Ich hätte am Donnerstag, 14. Juni um 9:30 Uhr oder am Freitag, 15. Juni um 14:00 Uhr.\nAm Donnerstag vormittag wäre perfekt.\nGut, dann notiere ich: Donnerstag, 14. Juni, 9:30 Uhr. Bitte seien Sie 10 Minuten vorher da. Noch etwas?\nNein, danke. Auf Wiederhören.\nAuf Wiederhören!", "question": "Welche Dokumente braucht man NICHT für den Termin?", "options": ["Pass", "Arbeitsvertrag", "Geburtsschein", "Passfotos"], "correct_answer": 2, "explanation": "Frau Keller lists: Pass, Arbeitsvertrag, Wohnsitzbestätigung, Passfotos. Geburtsschein (birth certificate) is not mentioned.", "audio_prompt": "Phone call with municipal office", "strategy_hint": "Listen carefully for the complete list. The question asks what is NOT needed, so eliminate the items that ARE mentioned."}', 0.6, 180, 'generated');

-- B1 Speaking - Housing
INSERT INTO content_items (type, level, theme, tactic, title, content, difficulty, time_estimate_seconds, source) VALUES
('speaking', 'B1', 'housing', 'role-play', 'Complaint about Apartment', '{"scenario": "Sie wohnen seit drei Monaten in einer Wohnung. Es gibt mehrere Probleme: Die Heizung funktioniert nicht richtig, und im Badezimmer ist Schimmel an der Wand. Sie rufen Ihren Vermieter an.", "tasks": ["Beschreiben Sie die Probleme", "Sagen Sie, seit wann die Probleme bestehen", "Bitten Sie um eine schnelle Lösung", "Fragen Sie, wann jemand vorbeikommt"], "evaluation_criteria": {"fluency": "Speaks with few hesitations", "range": "Uses varied vocabulary (Heizung, Schimmel, Vermieter, reparieren, etc.)", "accuracy": "Uses correct verb forms and word order", "task_completion": "Addresses all 4 points"}, "sample_answer": "Guten Tag, Herr Meier. Hier ist Anna Schmidt. Ich rufe wegen meiner Wohnung an. Es gibt zwei Probleme. Erstens: Die Heizung funktioniert nicht richtig. Das Zimmer wird nicht warm. Zweitens: Im Badezimmer ist Schimmel an der Wand. Diese Probleme bestehen schon seit zwei Wochen. Könnten Sie bitte jemanden schicken, um das zu reparieren? Wann kann jemand vorbeikommen? Vielen Dank."}', 0.7, 240, 'generated');

-- B1 Writing - Work
INSERT INTO content_items (type, level, theme, tactic, title, content, difficulty, time_estimate_seconds, source) VALUES
('writing', 'B1', 'work', 'paraphrase', 'Sick Leave Email', '{"prompt": "Sie sind krank und können heute nicht zur Arbeit kommen. Schreiben Sie eine E-Mail an Ihren Chef.", "tasks": ["Sagen Sie, dass Sie krank sind", "Erklären Sie, was Sie haben (z.B. Grippe, Fieber)", "Sagen Sie, wie lange Sie wahrscheinlich fehlen", "Sagen Sie, was mit Ihrer Arbeit passiert (Kollege übernimmt, oder Sie arbeiten später)"], "word_count": {"min": 60, "max": 100}, "checklist": ["Formale Anrede (Sehr geehrter...)", "Klare Begründung mit weil oder da", "Höfliche Formulierung", "Formaler Abschluss (Mit freundlichen Grüßen)"], "sample_answer": "Betreff: Krankmeldung\n\nSehr geehrter Herr Schmidt,\n\nleider muss ich Ihnen mitteilen, dass ich heute nicht zur Arbeit kommen kann, weil ich krank bin. Ich habe hohes Fieber und eine starke Grippe. Der Arzt hat mir empfohlen, drei Tage zu Hause zu bleiben.\n\nIch werde voraussichtlich am Donnerstag wieder im Büro sein. Meine Kollegin Frau Weber hat zugesagt, die dringenden Aufgaben zu übernehmen.\n\nVielen Dank für Ihr Verständnis.\n\nMit freundlichen Grüßen\nAnna Müller"}', 0.7, 300, 'generated');

-- Additional seed content (20 more items for variety)

INSERT INTO content_items (type, level, theme, tactic, title, content, difficulty, time_estimate_seconds, source) VALUES
('reading', 'A0', 'shopping', 'scan', 'Supermarket Hours', '{"text": "MIGROS Supermarkt\n\nÖffnungszeiten:\nMontag - Samstag: 08:00 - 20:00\nSonntag: geschlossen", "question": "Wann ist der Supermarkt am Samstag offen?", "options": ["06:00 - 18:00", "08:00 - 20:00", "10:00 - 18:00", "geschlossen"], "correct_answer": 1, "explanation": "Montag-Samstag haben die gleichen Öffnungszeiten: 08:00-20:00"}', 0.2, 60, 'generated'),

('reading', 'A1', 'transport', 'scan', 'Tram Ticket Types', '{"text": "ZVV Billette\n\nEinzelfahrt: 2.80 CHF\nTageskarte: 9.00 CHF\n9-Uhr-Tageskarte: 7.20 CHF\nMonatsabo: 80.00 CHF\n\nKinder unter 6: gratis", "question": "Wie viel kostet eine Tageskarte?", "options": ["2.80 CHF", "7.20 CHF", "9.00 CHF", "80.00 CHF"], "correct_answer": 2, "explanation": "Tageskarte kostet 9.00 CHF (not the cheaper 9-Uhr variant)"}', 0.3, 90, 'generated'),

('listening', 'A0', 'housing', 'gist', 'Neighbor Introduction', '{"transcript": "Guten Tag! Ich bin Ihre neue Nachbarin. Ich heiße Maria und ich wohne im dritten Stock, Wohnung Nummer 12. Ich komme aus Italien. Schön, Sie kennenzulernen!", "question": "Wo wohnt Maria?", "options": ["Erster Stock", "Zweiter Stock", "Dritter Stock", "Vierter Stock"], "correct_answer": 2, "explanation": "Maria says: ich wohne im dritten Stock", "audio_prompt": "Neighbor greeting"}', 0.2, 90, 'generated'),

('reading', 'A2', 'doctor', 'skim', 'Medical Certificate', '{"text": "Ärztliches Zeugnis\n\nPatient: Thomas Weber\nDatum: 12. April 2024\n\nHerr Weber ist vom 12. April bis 16. April 2024 arbeitsunfähig.\n\nDiagnose: Akute Bronchitis\nEmpfehlung: Bettruhe und viel trinken\n\nDr. med. Sandra Meier\nAllgemeinmedizin", "question": "Wie lange ist Herr Weber krankgeschrieben?", "options": ["3 Tage", "5 Tage", "7 Tage", "10 Tage"], "correct_answer": 1, "explanation": "Vom 12. bis 16. April = 5 Tage (12, 13, 14, 15, 16)"}', 0.4, 120, 'generated'),

('listening', 'A2', 'shopping', 'detail', 'Market Opening Hours', '{"transcript": "Willkommen beim Wochenmarkt am Münsterplatz. Wir sind jeden Samstag von 7 Uhr morgens bis 16 Uhr geöffnet. Sie finden bei uns frisches Gemüse, Obst, Käse, Brot und Blumen. Heute haben wir ein Spezialangebot: Tomaten, nur 3 Franken pro Kilo!", "question": "Was kostet ein Kilo Tomaten heute?", "options": ["2 CHF", "3 CHF", "4 CHF", "5 CHF"], "correct_answer": 1, "explanation": "Announcement says: Tomaten, nur 3 Franken pro Kilo", "audio_prompt": "Market announcement"}', 0.4, 120, 'generated');

-- More B1 level content
INSERT INTO content_items (type, level, theme, tactic, title, content, difficulty, time_estimate_seconds, source) VALUES
('reading', 'B1', 'gemeinde', 'inference', 'Tax Office Letter', '{"text": "Kantonales Steueramt\n\nSehr geehrte Frau Keller,\n\nIhre Steuererklärung für das Jahr 2023 ist bei uns eingegangen. Nach Prüfung Ihrer Unterlagen haben wir festgestellt, dass einige Belege fehlen:\n\n- Lohnausweis des Arbeitgebers\n- Nachweis über Krankenkassenprämien\n\nBitte reichen Sie diese Dokumente bis zum 30. Juni nach. Sollten die Unterlagen nicht fristgerecht eingehen, müssen wir Ihre Steuer schätzen, was zu einer höheren Steuerlast führen kann.\n\nMit freundlichen Grüßen\nSteueramt Zürich", "question": "Was passiert, wenn Frau Keller die Dokumente nicht schickt?", "options": ["Nichts, es ist nicht wichtig", "Sie bekommt Geld zurück", "Ihre Steuer wird geschätzt und könnte höher sein", "Sie muss keine Steuern zahlen"], "correct_answer": 2, "explanation": "Letter states: müssen wir Ihre Steuer schätzen, was zu einer höheren Steuerlast führen kann", "strategy_hint": "Look for consequence phrases like könnte höher sein to understand implications"}', 0.6, 180, 'generated'),

('writing', 'A2', 'housing', 'paraphrase', 'Apartment Viewing Request', '{"prompt": "Sie haben eine Wohnungsanzeige gesehen. Schreiben Sie eine E-Mail an den Vermieter.", "tasks": ["Sagen Sie, welche Wohnung Sie interessiert", "Stellen Sie 2 Fragen zur Wohnung", "Bitten Sie um einen Besichtigungstermin"], "word_count": {"min": 40, "max": 70}, "checklist": ["Höfliche Anrede", "Klare Fragen mit Fragezeichen", "Höflicher Abschluss"], "sample_answer": "Sehr geehrte Damen und Herren,\n\nich interessiere mich für die 3-Zimmer-Wohnung an der Bahnhofstrasse. Sind Haustiere erlaubt? Gibt es einen Parkplatz?\n\nKönnte ich die Wohnung nächste Woche besichtigen?\n\nMit freundlichen Grüßen\nTom Schmidt"}', 0.5, 240, 'generated');
