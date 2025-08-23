-- Deploy image management functions to Supabase
-- Run this in your Supabase SQL Editor

-- Function to batch insert images with proper ordering
CREATE OR REPLACE FUNCTION batch_insert_item_images(
  p_item_id UUID,
  p_image_urls TEXT[],
  p_alt_texts TEXT[] DEFAULT NULL,
  p_make_first_primary BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  item_id UUID,
  image_url TEXT,
  alt_text TEXT,
  sort_order INTEGER,
  is_primary BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  i INTEGER;
  max_sort_order INTEGER;
  current_alt_text TEXT;
BEGIN
  -- Get current max sort order for this item
  SELECT COALESCE(MAX(item_images.sort_order), -1) INTO max_sort_order
  FROM item_images
  WHERE item_images.item_id = p_item_id;

  -- If making first image primary, clear existing primary flags
  IF p_make_first_primary THEN
    UPDATE item_images 
    SET is_primary = false 
    WHERE item_images.item_id = p_item_id;
  END IF;

  -- Insert images
  FOR i IN 1..array_length(p_image_urls, 1) LOOP
    -- Get alt text if provided
    current_alt_text := NULL;
    IF p_alt_texts IS NOT NULL AND array_length(p_alt_texts, 1) >= i THEN
      current_alt_text := p_alt_texts[i];
    END IF;

    INSERT INTO item_images (
      item_id,
      image_url,
      alt_text,
      sort_order,
      is_primary
    ) VALUES (
      p_item_id,
      p_image_urls[i],
      current_alt_text,
      max_sort_order + i,
      p_make_first_primary AND i = 1
    );
  END LOOP;

  -- Return all images for the item
  RETURN QUERY
  SELECT 
    item_images.id,
    item_images.item_id,
    item_images.image_url,
    item_images.alt_text,
    item_images.sort_order,
    item_images.is_primary,
    item_images.created_at
  FROM item_images
  WHERE item_images.item_id = p_item_id
  ORDER BY item_images.sort_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION batch_insert_item_images(UUID, TEXT[], TEXT[], BOOLEAN) TO authenticated;
