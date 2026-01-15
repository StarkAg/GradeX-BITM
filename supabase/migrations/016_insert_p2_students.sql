-- ============================================================================
-- Insert P2 Section Students
-- ============================================================================
-- This migration adds all P2 section students to the database
-- Run this in Supabase SQL Editor
-- ============================================================================

-- First, ensure P2 section exists (create if it doesn't)
INSERT INTO public.sections (name)
VALUES ('P2')
ON CONFLICT (name) DO NOTHING;

-- Insert all P2 students
-- Using a subquery to get the P2 section ID and ON CONFLICT to prevent duplicates
INSERT INTO public.students (registration_number, name, section_id)
SELECT 
    reg_num,
    name_val,
    (SELECT id FROM public.sections WHERE name = 'P2' LIMIT 1)
FROM (VALUES
    ('RA2311003012184', 'UPASANA SINGH'),
    ('RA2311003012185', 'ARPIT SINGH BAIS'),
    ('RA2311003012186', 'MRINAL YASH'),
    ('RA2311003012187', 'DEINOL MASCARENHAS'),
    ('RA2311003012188', 'BALAJI G'),
    ('RA2311003012189', 'DWARAMPUDI KANAKA SATYA PRIYANKKA'),
    ('RA2311003012190', 'AKSHAT SRIVASTAVA'),
    ('RA2311003012191', 'SHAKSHI TIWARY'),
    ('RA2311003012192', 'DIVYANSHU KUMAR'),
    ('RA2311003012193', 'BABY AFSHEEN'),
    ('RA2311003012194', 'SIDDHARTH MALIK'),
    ('RA2311003012195', 'ASHISH KUMAR'),
    ('RA2311003012196', 'ADITYA NIKHORIA'),
    ('RA2311003012197', 'SHAIK MOHAMMED SAIF'),
    ('RA2311003012198', 'DEBOSMITA PAUL'),
    ('RA2311003012199', 'HARI KRISHNAN'),
    ('RA2311003012200', 'RISHU KUMAR DASOUNDHI'),
    ('RA2311003012201', 'RISHAB SRIPATHY'),
    ('RA2311003012202', 'PALLANTLA SAISAHITH'),
    ('RA2311003012203', 'ARPITA MISHRA'),
    ('RA2311003012204', 'ABHI KHAREL'),
    ('RA2311003012205', 'AAYUSHA BHATTARAI'),
    ('RA2311003012206', 'GAUTAM PRASAD UPADHYAY'),
    ('RA2311003012208', 'HEMANG DUBEY'),
    ('RA2311003012209', 'TELAPROLU RADHA KRISHNA MURTHY'),
    ('RA2311003012210', 'HEET JAIN'),
    ('RA2311003012211', 'VISHVA SHAH'),
    ('RA2311003012212', 'SRIANSU PATRA'),
    ('RA2311003012213', 'NAVYA ASTHANA'),
    ('RA2311003012214', 'VATSAL BISHT'),
    ('RA2311003012215', 'ARK SARAF'),
    ('RA2311003012216', 'KARTIK GAWADE'),
    ('RA2311003012217', 'N V S S RISHI BODA'),
    ('RA2311003012219', 'SIDDHESH SUDHIR BIJWE'),
    ('RA2311003012220', 'MARNI ABHI SAI'),
    ('RA2311003012221', 'JANVI'),
    ('RA2311003012222', 'ADITI AJITKUMAR CHOUGALE'),
    ('RA2311003012223', 'GAUTAM SONI'),
    ('RA2311003012224', 'B TEJASHWIN'),
    ('RA2311003012225', 'ARIIN DATTATRAYA PATIL'),
    ('RA2311003012226', 'VENKATA SAI HARISH DHARMAVARAPU'),
    ('RA2311003012227', 'JOVINSHA MARY FILA J'),
    ('RA2311003012228', 'MOHAMMED AZHAN AABDIN'),
    ('RA2311003012229', 'VISHAL M'),
    ('RA2311003012230', 'ANANYA SINGH'),
    ('RA2311003012231', 'REDDI VARUN KUMAR'),
    ('RA2311003012232', 'AVIRAL PAL'),
    ('RA2311003012233', 'USHIKA LUNAWAT'),
    ('RA2311003012234', 'SURADA VAISHNAVI'),
    ('RA2311003012235', 'PRAKHAR GOYAL'),
    ('RA2311003012236', 'SRIVISHWAK R'),
    ('RA2311003012237', 'DHARSHAN S'),
    ('RA2311003012238', 'LINGESHWARAN RAMACHANDRAN'),
    ('RA2311003012240', 'SANJAI KUMAR R'),
    ('RA2311003012242', 'BHUVANESH K R'),
    ('RA2311003012243', 'LAGADAPATI DHATHRI CHOWDARY'),
    ('RA2311003012244', 'WADIWALA RIMSHA ALTAF'),
    ('RA2311003012245', 'MALA PRAJEETH'),
    ('RA2311003012246', 'HARSH AGARWAL')
) AS students_data(reg_num, name_val)
ON CONFLICT (registration_number, section_id) 
DO UPDATE SET 
    name = EXCLUDED.name,
    updated_at = NOW();

-- ============================================================================
-- Verification
-- ============================================================================
-- Check how many P2 students were inserted
DO $$
DECLARE
    p2_count INTEGER;
    p2_section_id UUID;
BEGIN
    SELECT id INTO p2_section_id FROM public.sections WHERE name = 'P2';
    IF p2_section_id IS NOT NULL THEN
        SELECT COUNT(*) INTO p2_count FROM public.students WHERE section_id = p2_section_id;
        RAISE NOTICE '✓ Total P2 students in database: %', p2_count;
    ELSE
        RAISE WARNING '⚠ P2 section not found';
    END IF;
END $$;

