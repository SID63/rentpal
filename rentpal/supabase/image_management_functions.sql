-- Image Management Database Functions
-- These functions provide atomic operations for image management

-- Function to reorder images for an item
CREATE OR REPLACE FUNCTION reorder_item_images(
  p_item_id UUID,
  p_image_ids UUID[]
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
  image_id UUID;
BEGIN
  -- Verify all images belong to the item
  IF (SELECT COUNT(*) FROM item_images WHERE item_images.item_id = p_item_id AND item_images.id = ANY(p_image_ids)) != array_length(p_image_ids, 1) THEN
    RAISE EXCEPTION 'Some images do not belong to the specified item';
  END IF;

  -- Update sort orders
  FOR i IN 1..array_length(p_image_ids, 1) LOOP
    image_id := p_image_ids[i];
    UPDATE item_images 
    SET sort_order = i - 1 
    WHERE item_images.id = image_id AND item_images.item_id = p_item_id;
  END LOOP;

  -- Return updated images
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

-- Function to set primary image for an item
CREATE OR REPLACE FUNCTION set_primary_item_image(
  p_item_id UUID,
  p_image_id UUID
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
BEGIN
  -- Verify image belongs to item
  IF NOT EXISTS (SELECT 1 FROM item_images WHERE item_images.id = p_image_id AND item_images.item_id = p_item_id) THEN
    RAISE EXCEPTION 'Image does not belong to the specified item';
  END IF;

  -- Clear all primary flags for this item
  UPDATE item_images 
  SET is_primary = false 
  WHERE item_images.item_id = p_item_id;

  -- Set the specified image as primary
  UPDATE item_images 
  SET is_primary = true 
  WHERE item_images.id = p_image_id;

  -- Return updated images
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

-- Function to delete images and return their URLs for storage cleanup
CREATE OR REPLACE FUNCTION delete_item_images_by_ids(
  p_image_ids UUID[]
)
RETURNS TABLE (
  deleted_image_url TEXT
) AS $$
BEGIN
  -- Return URLs of images to be deleted (for storage cleanup)
  RETURN QUERY
  SELECT item_images.image_url
  FROM item_images
  WHERE item_images.id = ANY(p_image_ids);

  -- Delete the images
  DELETE FROM item_images
  WHERE item_images.id = ANY(p_image_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete all images for an item
CREATE OR REPLACE FUNCTION delete_all_item_images(
  p_item_id UUID
)
RETURNS TABLE (
  deleted_image_url TEXT
) AS $$
BEGIN
  -- Return URLs of images to be deleted (for storage cleanup)
  RETURN QUERY
  SELECT item_images.image_url
  FROM item_images
  WHERE item_images.item_id = p_item_id;

  -- Delete the images
  DELETE FROM item_images
  WHERE item_images.item_id = p_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find and clean up orphaned images
CREATE OR REPLACE FUNCTION cleanup_orphaned_images()
RETURNS TABLE (
  orphaned_image_id UUID,
  orphaned_image_url TEXT,
  orphaned_item_id UUID
) AS $$
BEGIN
  -- Find images that reference non-existent items
  RETURN QUERY
  SELECT 
    item_images.id,
    item_images.image_url,
    item_images.item_id
  FROM item_images
  LEFT JOIN items ON items.id = item_images.item_id
  WHERE items.id IS NULL;

  -- Delete orphaned images
  DELETE FROM item_images
  WHERE item_images.id IN (
    SELECT item_images.id
    FROM item_images
    LEFT JOIN items ON items.id = item_images.item_id
    WHERE items.id IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get image statistics for an item
CREATE OR REPLACE FUNCTION get_item_image_stats(
  p_item_id UUID
)
RETURNS TABLE (
  total_images INTEGER,
  has_primary BOOLEAN,
  primary_image_url TEXT,
  total_size_estimate BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_images,
    BOOL_OR(item_images.is_primary) as has_primary,
    (SELECT item_images.image_url FROM item_images WHERE item_images.item_id = p_item_id AND item_images.is_primary LIMIT 1) as primary_image_url,
    -- Rough size estimate (this would need actual file size tracking)
    (COUNT(*) * 1024 * 1024)::BIGINT as total_size_estimate
  FROM item_images
  WHERE item_images.item_id = p_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION reorder_item_images(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION set_primary_item_image(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_insert_item_images(UUID, TEXT[], TEXT[], BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_item_images_by_ids(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_all_item_images(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_images() TO authenticated;
GRANT EXECUTE ON FUNCTION get_item_image_stats(UUID) TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_item_images_item_id_sort_order ON item_images(item_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_item_images_is_primary ON item_images(item_id, is_primary) WHERE is_primary = true;