-- Phase II national district reference data.
-- Run in pgAdmin Query Tool after 008_phase2_wef_nexus.sql.
-- Safe to re-run: existing province/district pairs are skipped.

INSERT INTO districts (province, name)
SELECT seed.province, district.name
FROM (
  VALUES
    ('Punjab', ARRAY['Attock','Bahawalnagar','Bahawalpur','Bhakkar','Chakwal','Chiniot','Dera Ghazi Khan','Faisalabad','Gujranwala','Gujrat','Hafizabad','Jhang','Jhelum','Kasur','Khanewal','Khushab','Kot Addu','Lahore','Layyah','Lodhran','Mandi Bahauddin','Mianwali','Multan','Murree','Muzaffargarh','Nankana Sahib','Narowal','Okara','Pakpattan','Rahim Yar Khan','Rajanpur','Rawalpindi','Sahiwal','Sargodha','Sheikhupura','Sialkot','Talagang','Taunsa','Toba Tek Singh','Vehari','Wazirabad']::varchar[]),
    ('Sindh', ARRAY['Badin','Dadu','Ghotki','Hyderabad','Jacobabad','Jamshoro','Kamber Shahdadkot','Karachi Central','Karachi East','Karachi South','Karachi West','Kashmore','Keamari','Khairpur','Korangi','Larkana','Malir','Matiari','Mirpur Khas','Naushahro Feroze','Sanghar','Shaheed Benazirabad','Shikarpur','Sujawal','Sukkur','Tando Allahyar','Tando Muhammad Khan','Tharparkar','Thatta','Umerkot']::varchar[]),
    ('Khyber Pakhtunkhwa', ARRAY['Abbottabad','Bajaur','Bannu','Battagram','Buner','Charsadda','Dera Ismail Khan','Hangu','Haripur','Karak','Khyber','Kohat','Kolai-Palas','Kurram','Lakki Marwat','Lower Chitral','Lower Dir','Lower Kohistan','Malakand','Mansehra','Mardan','Mohmand','North Waziristan','Nowshera','Orakzai','Peshawar','Shangla','South Waziristan','Swabi','Swat','Tank','Torghar','Upper Chitral','Upper Dir','Upper Kohistan']::varchar[]),
    ('Balochistan', ARRAY['Awaran','Barkhan','Chagai','Chaman','Dera Bugti','Duki','Gwadar','Harnai','Hub','Jafarabad','Jhal Magsi','Kachhi','Kalat','Kech','Kharan','Khuzdar','Kohlu','Lasbela','Loralai','Mastung','Musakhel','Nasirabad','Nushki','Panjgur','Pishin','Qilla Abdullah','Qilla Saifullah','Quetta','Sherani','Sibi','Sohbatpur','Surab','Usta Muhammad','Washuk','Zhob','Ziarat']::varchar[]),
    ('Gilgit-Baltistan', ARRAY['Astore','Darel','Diamer','Ghanche','Ghizer','Gilgit','Gupis-Yasin','Hunza','Kharmang','Nagar','Roundu','Shigar','Skardu','Tangir']::varchar[]),
    ('Azad Jammu and Kashmir', ARRAY['Bagh','Bhimber','Hattian Bala','Haveli','Kotli','Mirpur','Muzaffarabad','Neelum','Poonch','Sudhnoti']::varchar[]),
    ('Islamabad Capital Territory', ARRAY['Islamabad']::varchar[])
) AS seed(province, districts)
CROSS JOIN LATERAL unnest(seed.districts) AS district(name)
ON CONFLICT (province, name) DO NOTHING;

SELECT province, COUNT(*) AS district_count
FROM districts
GROUP BY province
ORDER BY province;

SELECT COUNT(*) AS total_districts FROM districts;
