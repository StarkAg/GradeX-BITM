/**
 * GroupGrid API Handler
 * Handles all GroupGrid-related API requests
 */

import { supabaseAdmin, isSupabaseConfigured } from '../lib/api-utils/supabase-client.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, ra } = req.query;

  // Log for debugging
  console.log('[GroupGrid API] Request:', req.method, req.path, 'action:', action, 'ra:', ra);

  try {
    if (!isSupabaseConfigured() || !supabaseAdmin) {
      console.error('[GroupGrid API] Supabase not configured');
      console.error('[GroupGrid API] SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
      console.error('[GroupGrid API] SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
      return res.status(500).json({
      status: 'error',
        error: 'Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
      });
    }

    // Legacy endpoint support (without action parameter)
    if (!action) {
      // Handle legacy GET requests
      if (req.method === 'GET') {
        if (ra) {
          return await handleLegacyGetByRA(req, res, ra);
        } else {
          return await handleLegacyGetAll(req, res);
        }
      }
      // Handle legacy POST requests (create/update entry)
      if (req.method === 'POST') {
        return await handleLegacyPost(req, res);
      }
      // Handle legacy PATCH requests (update entry)
      if (req.method === 'PATCH') {
        return await handleLegacyPatch(req, res);
      }
      // If no action and not a legacy endpoint, return error
      return res.status(400).json({
        status: 'error',
        error: 'Missing action parameter. Valid actions: get-stats, get-sections, get-subjects, create-formation, get-formations, join-formation, close-formation, delete-formation, get-formation-by-code, create-group, update-group, delete-group, save-students, get-students'
      });
    }

    switch (action) {
      case 'get-stats':
        return await getStats(req, res);
      case 'get-sections':
        return await getSections(req, res);
      case 'get-subjects':
        return await getSubjects(req, res);
      case 'create-formation':
        return await createFormation(req, res);
      case 'get-formations':
        return await getFormations(req, res);
      case 'join-formation':
        return await joinFormation(req, res);
      case 'close-formation':
        return await closeFormation(req, res);
      case 'delete-formation':
        return await deleteFormation(req, res);
      case 'get-formation-by-code':
        return await getFormationByCode(req, res);
      case 'create-group':
        return await createGroup(req, res);
      case 'save-students':
        return await saveStudents(req, res);
      case 'get-students':
        return await getStudents(req, res);
      case 'update-group':
        return await updateGroup(req, res);
      case 'delete-group':
        return await deleteGroup(req, res);
      default:
        return res.status(400).json({
          status: 'error',
          error: 'Invalid action'
        });
    }
  } catch (error) {
    console.error('[GroupGrid API] Error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * Get GroupGrid statistics
 */
async function getStats(req, res) {
  try {
    console.log('[GroupGrid API] getStats: Starting...');
    
    // Get total groups formed
    const { count: groupsCount, error: groupsError } = await supabaseAdmin
      .from('groups')
      .select('*', { count: 'exact', head: true });

    if (groupsError) {
      console.error('[GroupGrid API] getStats: groupsError:', groupsError);
      // If table doesn't exist, return zeros instead of error
      if (groupsError.code === '42P01' || groupsError.message?.includes('does not exist')) {
        console.warn('[GroupGrid API] Groups table does not exist yet. Returning zeros.');
        return res.status(200).json({
          status: 'ok',
          stats: {
            groupsFormed: 0,
            sectionsInvolved: 0,
            totalFormations: 0,
            activeFormations: 0
          }
        });
      }
      throw groupsError;
    }

    // Get distinct sections involved (handle both ID and name for custom/manual sections)
    const { data: formationsData, error: formationsError } = await supabaseAdmin
      .from('group_formations')
      .select('section_id, section_name');
          
    if (formationsError) {
      console.error('[GroupGrid API] getStats: formationsError:', formationsError);
      // If table doesn't exist, return zeros
      if (formationsError.code === '42P01' || formationsError.message?.includes('does not exist')) {
        console.warn('[GroupGrid API] Group_formations table does not exist yet. Returning zeros.');
        return res.status(200).json({
          status: 'ok',
          stats: {
            groupsFormed: groupsCount || 0,
            sectionsInvolved: 0,
            totalFormations: 0,
            activeFormations: 0
          }
        });
      }
      throw formationsError;
    }

    // Prefer section_id; fall back to section_name when id is null (custom input)
    const sectionsInvolved = new Set(
      (formationsData || [])
        .map(f => f.section_id || f.section_name || null)
        .filter(Boolean)
    ).size;

    // Get total formations
    const { count: formationsCount, error: formationsCountError } = await supabaseAdmin
      .from('group_formations')
      .select('*', { count: 'exact', head: true });

    if (formationsCountError) {
      console.error('[GroupGrid API] getStats: formationsCountError:', formationsCountError);
      throw formationsCountError;
        }
        
    // Get active formations (open status)
    const { count: activeFormationsCount, error: activeError } = await supabaseAdmin
      .from('group_formations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    if (activeError) {
      console.error('[GroupGrid API] getStats: activeError:', activeError);
      throw activeError;
        }
        
    console.log('[GroupGrid API] getStats: Success', {
      groupsFormed: groupsCount || 0,
      sectionsInvolved,
      totalFormations: formationsCount || 0,
      activeFormations: activeFormationsCount || 0
    });

    return res.status(200).json({
      status: 'ok',
      stats: {
        groupsFormed: groupsCount || 0,
        sectionsInvolved: sectionsInvolved,
        totalFormations: formationsCount || 0,
        activeFormations: activeFormationsCount || 0
      }
          });
  } catch (error) {
    console.error('[GroupGrid API] getStats error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
}

/**
 * Get all sections
 */
async function getSections(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('sections')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      status: 'ok',
      sections: data || []
    });
  } catch (error) {
    console.error('[GroupGrid API] getSections error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
}

/**
 * Get subjects (optionally filtered by section)
 */
async function getSubjects(req, res) {
  try {
    const { section_id } = req.query;

    let query = supabaseAdmin
      .from('subjects')
      .select('*')
      .order('name', { ascending: true });

    if (section_id) {
      query = query.eq('section_id', section_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({
        status: 'ok',
      subjects: data || []
    });
  } catch (error) {
    console.error('[GroupGrid API] getSubjects error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
}

/**
 * Create a new group formation
 */
async function createFormation(req, res) {
  try {
    const { section_id, section_name, subject_id, subject_name, members_per_team, include_title, created_by } = req.body;

    // Validation - section and subject are required (can be custom typed or from database)
    if (!members_per_team) {
      return res.status(400).json({
        status: 'error',
        error: 'Members per team is required'
      });
    }

    // Either section_id or section_name must be provided
    if (!section_id && !section_name) {
      return res.status(400).json({
        status: 'error',
        error: 'Section is required'
      });
    }

    // Either subject_id or subject_name must be provided
    if (!subject_id && !subject_name) {
      return res.status(400).json({
          status: 'error',
        error: 'Subject is required'
      });
    }

    // Generate anonymous user ID if not provided (must be valid UUID format)
    const generateAnonymousId = () => {
      // Generate a UUID v4 format
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    const creatorId = created_by || generateAnonymousId();

    if (members_per_team < 2 || members_per_team > 8) {
      return res.status(400).json({
        status: 'error',
        error: 'Members per team must be between 2 and 8'
      });
      }

    // Generate unique formation code (8 characters, alphanumeric, uppercase)
    const generateFormationCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars like 0, O, I, 1
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let formationCode = generateFormationCode();
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure code is unique
    while (attempts < maxAttempts) {
      const { data: existing } = await supabaseAdmin
        .from('group_formations')
        .select('id')
        .eq('formation_code', formationCode)
        .maybeSingle();
      
      if (!existing) break; // Code is unique
      formationCode = generateFormationCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return res.status(500).json({
        status: 'error',
        error: 'Failed to generate unique formation code'
      });
    }

    // Create formation
    const { data: formation, error: formationError } = await supabaseAdmin
      .from('group_formations')
      .insert({
        section_id: section_id || null, // Can be null if custom section
        section_name: section_name || null, // Custom section name
        subject_id: subject_id || null, // Can be null if custom subject
        subject_name: subject_name || null, // Custom subject name
        members_per_team,
        include_title: include_title !== false, // Default to true
        created_by: creatorId,
        status: 'open',
        formation_code: formationCode
      })
      .select()
      .single();
        
    if (formationError) throw formationError;

    // Calculate number of groups needed (we'll need total students in section)
    // For now, we'll create groups dynamically when students join
    // But we can pre-create empty groups if needed

    return res.status(200).json({
      status: 'ok',
      formation
    });
  } catch (error) {
    console.error('[GroupGrid API] createFormation error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
}

/**
 * Get all formations (optionally filtered by status)
 */
async function getFormations(req, res) {
  try {
    const { status } = req.query;

    let query = supabaseAdmin
      .from('group_formations')
      .select(`
        *,
        section:sections(name),
        subject:subjects(name),
        groups(
          id,
          title,
          group_members(id)
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Process data to calculate slots
    const formations = (data || []).map(formation => {
      const groups = formation.groups || [];
      let totalSlots = 0;
      let filledSlots = 0;

      groups.forEach(group => {
        const memberCount = Array.isArray(group.group_members) ? group.group_members.length : 0;
        totalSlots += formation.members_per_team;
        filledSlots += memberCount;
      });

      return {
        ...formation,
        section_name: formation.section?.name || formation.section_name || null,
        subject_name: formation.subject?.name || formation.subject_name || null,
        total_slots: totalSlots,
        filled_slots: filledSlots,
        groups_count: groups.length
      };
    });

    return res.status(200).json({
        status: 'ok',
      formations
    });
  } catch (error) {
    console.error('[GroupGrid API] getFormations error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
      }

/**
 * Join a group formation
 */
async function joinFormation(req, res) {
  try {
    const { formation_id, user_id } = req.body;

    if (!formation_id) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing formation_id'
      });
    }

    // Generate anonymous user ID if not provided (must be valid UUID format)
    const generateAnonymousId = () => {
      // Generate a UUID v4 format
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    const userId = user_id || generateAnonymousId();

    // Check if formation exists and is open
    const { data: formation, error: formationError } = await supabaseAdmin
      .from('group_formations')
      .select('*, groups(id, group_members(id))')
      .eq('id', formation_id)
      .single();

    if (formationError) throw formationError;

    if (formation.status !== 'open') {
      return res.status(400).json({
          status: 'error',
        error: 'Formation is closed'
      });
    }

    // Check if user already joined
    const { data: existingMembership, error: checkError } = await supabaseAdmin
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)
      .in('group_id', formation.groups.map(g => g.id));

    if (checkError) throw checkError;

    if (existingMembership && existingMembership.length > 0) {
      return res.status(400).json({
          status: 'error',
        error: 'You have already joined this formation'
      });
    }

    // Find group with least members
    let targetGroup = null;
    let minMembers = Infinity;

    for (const group of formation.groups) {
      const memberCount = Array.isArray(group.group_members) ? group.group_members.length : 0;
      if (memberCount < formation.members_per_team && memberCount < minMembers) {
        minMembers = memberCount;
        targetGroup = group;
      }
    }

    // If all groups are full, create a new group
    if (!targetGroup) {
      // Get formation details for title generation
      const { data: formationDetails, error: detailsError } = await supabaseAdmin
        .from('group_formations')
        .select('include_title, groups(id)')
        .eq('id', formation_id)
        .single();

      if (detailsError) throw detailsError;

      const groupCount = Array.isArray(formationDetails.groups) ? formationDetails.groups.length : 0;
      const title = formationDetails.include_title 
        ? `Group ${String.fromCharCode(65 + groupCount)}` // A, B, C, etc.
        : null;

      const { data: newGroup, error: groupError } = await supabaseAdmin
        .from('groups')
        .insert({
          formation_id,
          title
        })
        .select()
        .single();

      if (groupError) throw groupError;
      targetGroup = newGroup;
    }

    // Add user to group
    const { data: membership, error: joinError } = await supabaseAdmin
      .from('group_members')
      .insert({
        group_id: targetGroup.id,
        user_id: userId
      })
      .select()
      .single();

    if (joinError) throw joinError;

    return res.status(200).json({
        status: 'ok',
      membership,
      group: targetGroup
    });
  } catch (error) {
    console.error('[GroupGrid API] joinFormation error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
}

/**
 * Close a formation (only creator can do this)
 */
async function closeFormation(req, res) {
  try {
    const { formation_id, user_id } = req.body;

    if (!formation_id || !user_id) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing required fields'
      });
    }

    // Check if user is the creator
    const { data: formation, error: formationError } = await supabaseAdmin
      .from('group_formations')
      .select('created_by')
      .eq('id', formation_id)
      .single();

    if (formationError) throw formationError;

    if (formation.created_by !== user_id) {
      return res.status(403).json({
        status: 'error',
        error: 'Only the formation creator can close it'
      });
    }

    // Update status
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('group_formations')
      .update({ status: 'closed' })
      .eq('id', formation_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.status(200).json({
      status: 'ok',
      formation: updated
    });
  } catch (error) {
    console.error('[GroupGrid API] closeFormation error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
      }
}

/**
 * Delete a formation (only allowed if it has 0 groups)
 */
async function deleteFormation(req, res) {
  try {
    const { formation_id } = req.body;

    if (!formation_id) {
      return res.status(400).json({
        status: 'error',
        error: 'Formation ID is required'
      });
    }

    // Check if formation exists and count its groups
    const { data: formation, error: formationError } = await supabaseAdmin
      .from('group_formations')
      .select(`
        id,
        groups(id)
      `)
      .eq('id', formation_id)
      .single();

    if (formationError) {
      if (formationError.code === 'PGRST116') {
        return res.status(404).json({
          status: 'error',
          error: 'Formation not found'
        });
      }
      throw formationError;
    }

    // Check if formation has any groups
    const groupsCount = Array.isArray(formation.groups) ? formation.groups.length : 0;

    if (groupsCount > 0) {
      return res.status(400).json({
        status: 'error',
        error: `Cannot delete formation with ${groupsCount} group(s). Only formations with 0 groups can be deleted.`
      });
    }

    // Delete the formation (CASCADE will delete related groups, members, etc. if any exist)
    const { error: deleteError } = await supabaseAdmin
      .from('group_formations')
      .delete()
      .eq('id', formation_id);

    if (deleteError) throw deleteError;

    console.log(`[GroupGrid API] ✓ Deleted formation ${formation_id} (0 groups)`);

    return res.status(200).json({
      status: 'ok',
      message: 'Formation deleted successfully'
    });

  } catch (error) {
    console.error('[GroupGrid API] deleteFormation error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message || 'Failed to delete formation'
    });
  }
}

/**
 * Get formation by code
 */
async function getFormationByCode(req, res) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        status: 'error',
        error: 'Formation code is required'
      });
    }

    // Get formation by code
    const { data: formation, error: formationError } = await supabaseAdmin
      .from('group_formations')
      .select(`
        *,
        sections:section_id (id, name),
        subjects:subject_id (id, name)
      `)
      .eq('formation_code', code.toUpperCase())
      .maybeSingle();

    if (formationError) throw formationError;

    if (!formation) {
      return res.status(404).json({
        status: 'error',
        error: 'Formation not found'
      });
    }

    // Get groups for this formation, ordered by group_number (or created_at if null)
    const { data: groups, error: groupsError } = await supabaseAdmin
      .from('groups')
      .select(`
        *,
        group_members (
          id,
          user_id,
          joined_at
        ),
        group_student_members (
          id,
          student_id,
          registration_number,
            name,
          joined_at
        )
      `)
      .eq('formation_id', formation.id)
      .order('group_number', { ascending: true, nullsLast: true })
      .order('created_at', { ascending: true });

    if (groupsError) throw groupsError;

    // Format groups with member counts (both user members and student members)
    const formattedGroups = (groups || []).map(group => {
      const userMembers = group.group_members || [];
      const studentMembers = group.group_student_members || [];
      const totalMembers = userMembers.length + studentMembers.length;
      
      return {
        ...group,
        member_count: totalMembers,
        members: userMembers, // Keep for backward compatibility
        student_members: studentMembers, // New: student members
        all_members: [...userMembers, ...studentMembers] // Combined list
      };
    });

    return res.status(200).json({
      status: 'ok',
      formation: {
        ...formation,
        section_name: formation.sections?.name || formation.section_name || null,
        subject_name: formation.subjects?.name || formation.subject_name || null
      },
      groups: formattedGroups
    });
  } catch (error) {
    console.error('[GroupGrid API] getFormationByCode error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
}

/**
 * Create a new group
 */
async function createGroup(req, res) {
  try {
    const { formation_id, title, creator_id, members } = req.body;

    if (!formation_id) {
      return res.status(400).json({
        status: 'error',
        error: 'Formation ID is required'
      });
    }

    // Generate anonymous user ID if not provided (must be valid UUID format)
    const generateAnonymousId = () => {
      // Generate a UUID v4 format
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    const creatorId = creator_id || generateAnonymousId();

    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        status: 'error',
        error: 'At least one member is required'
      });
    }

    // Get formation to check if it exists
    const { data: formation, error: formationError } = await supabaseAdmin
      .from('group_formations')
      .select('*')
      .eq('id', formation_id)
      .maybeSingle();

    if (formationError) throw formationError;
    if (!formation) {
      return res.status(404).json({
          status: 'error',
        error: 'Formation not found'
      });
    }

    // Check maximum groups limit based on total students
    const { count: totalStudents, error: studentsCountError } = await supabaseAdmin
          .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('section_id', formation.section_id);

    if (studentsCountError) {
      console.error('[GroupGrid API] Error counting students:', studentsCountError);
      // Continue if count fails, but log the error
    } else if (totalStudents) {
      // Calculate max groups: ceil(total_students / members_per_team)
      // This allows the last group to have fewer members if needed
      const maxGroups = Math.ceil(totalStudents / formation.members_per_team);
      
      // Count existing groups in this formation
      const { count: existingGroupsCount, error: groupsCountError } = await supabaseAdmin
        .from('groups')
        .select('*', { count: 'exact', head: true })
        .eq('formation_id', formation_id);

      if (!groupsCountError && existingGroupsCount !== null) {
        if (existingGroupsCount >= maxGroups) {
          return res.status(400).json({
            status: 'error',
            error: `Maximum ${maxGroups} groups allowed. You have ${totalStudents} students and ${formation.members_per_team} members per team.`
          });
      }
      }
    }

    // Extract group number and custom title from formatted title if needed
    // Title format: "Group {number}" or "Group {number} - {custom title}"
    let groupNumber = null;
    let customTitle = title || null;
    
    if (title) {
      const numberMatch = title.match(/^Group\s+(\d+)/i);
      if (numberMatch) {
        groupNumber = parseInt(numberMatch[1]);
        // Extract custom title if present: "Group 1 - Custom Title"
        const titleMatch = title.match(/^Group\s+\d+\s*-\s*(.+)$/i);
        customTitle = titleMatch ? titleMatch[1].trim() : null;
        } else {
        // If title doesn't start with "Group X", it's just a custom title
        // Try to extract group number from req.body if provided separately
        groupNumber = req.body.group_number || null;
      }
    }
    
    // If group_number is provided separately, use it
    if (req.body.group_number) {
      groupNumber = parseInt(req.body.group_number);
    }

    // Create the group with separate group_number and title fields
    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .insert({
        formation_id: formation_id,
        group_number: groupNumber,
        title: customTitle || null
      })
      .select()
      .single();

    if (groupError) throw groupError;

    // Get formation section to look up students
    const { data: section, error: sectionError } = await supabaseAdmin
      .from('sections')
      .select('id')
      .eq('id', formation.section_id)
      .single();

    if (sectionError) throw sectionError;

    // Look up students by registration numbers
    // Members should be an array of { registration_number, name } or just registration_number strings
    const registrationNumbers = members.map(m => {
      if (typeof m === 'string') {
        // If it's a string, try to extract registration number (format: "RA...")
        return m.trim();
      } else if (m && m.registration_number) {
        return m.registration_number.trim();
      }
      return null;
    }).filter(Boolean);

    if (registrationNumbers.length === 0) {
      return res.status(400).json({
          status: 'error',
        error: 'No valid registration numbers provided'
      });
    }

    // Fetch students by registration numbers from the formation's section
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('id, registration_number, name')
      .eq('section_id', formation.section_id)
      .in('registration_number', registrationNumbers);

    if (studentsError) throw studentsError;

    if (students.length !== registrationNumbers.length) {
      const foundRegNumbers = students.map(s => s.registration_number);
      const missing = registrationNumbers.filter(reg => !foundRegNumbers.includes(reg));
      return res.status(400).json({
        status: 'error',
        error: `Some students not found: ${missing.join(', ')}`
      });
    }

    // Insert all student members into group_student_members
    const studentMemberInserts = students.map(student => ({
      group_id: group.id,
      student_id: student.id,
      registration_number: student.registration_number,
      name: student.name
    }));

    const { data: insertedStudentMembers, error: studentMembersError } = await supabaseAdmin
      .from('group_student_members')
      .insert(studentMemberInserts)
      .select();

    if (studentMembersError) {
      console.error('[GroupGrid API] Error inserting student members:', studentMembersError);
      // Check if table doesn't exist
      if (studentMembersError.code === '42P01' || studentMembersError.message?.includes('does not exist')) {
        throw new Error('group_student_members table does not exist. Please run migration 015_add_group_student_members.sql');
      }
      throw studentMembersError;
    }

    console.log('[GroupGrid API] Successfully inserted', insertedStudentMembers.length, 'student members');

    return res.status(200).json({
        status: 'ok',
      group: {
        ...group,
        member_count: insertedStudentMembers.length,
        student_members: insertedStudentMembers
      }
    });
  } catch (error) {
    console.error('[GroupGrid API] createGroup error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
}

/**
 * Save students to a section
 * Accepts: section_name (string), students (array of {registration_number, name})
 */
async function saveStudents(req, res) {
  try {
    const { section_name, students } = req.body;

    if (!section_name) {
      return res.status(400).json({
        status: 'error',
        error: 'Section name is required'
      });
    }

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        status: 'error',
        error: 'Students array is required and must not be empty'
      });
    }

    // Validate student data format
    for (const student of students) {
      if (!student.registration_number || !student.name) {
        return res.status(400).json({
          status: 'error',
          error: 'Each student must have registration_number and name'
        });
      }
    }

    // Get section by name
    const { data: section, error: sectionError } = await supabaseAdmin
      .from('sections')
      .select('id')
      .eq('name', section_name)
      .maybeSingle();

    if (sectionError) throw sectionError;
    if (!section) {
      return res.status(404).json({
          status: 'error',
        error: `Section "${section_name}" not found. Please create the section first.`
      });
      }

    // Prepare student inserts
    const studentInserts = students.map(student => ({
      registration_number: student.registration_number.trim(),
      name: student.name.trim(),
      section_id: section.id
    }));

    // Insert students (using upsert to handle duplicates gracefully)
    const { data: insertedStudents, error: insertError } = await supabaseAdmin
      .from('students')
      .upsert(studentInserts, {
        onConflict: 'registration_number,section_id',
        ignoreDuplicates: false // Update existing records
      })
      .select();

    if (insertError) {
      console.error('[GroupGrid API] saveStudents insert error:', insertError);
      throw insertError;
    }

    return res.status(200).json({
        status: 'ok',
      message: `Successfully saved ${insertedStudents.length} student(s) to section "${section_name}"`,
      section_id: section.id,
      section_name: section_name,
      students_saved: insertedStudents.length,
      students: insertedStudents
    });
  } catch (error) {
    console.error('[GroupGrid API] saveStudents error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
}

/**
 * Get students by section
 * Accepts: section_name (string) or section_id (UUID)
 */
async function getStudents(req, res) {
  try {
    const { section_name, section_id } = req.query;

    if (!section_name && !section_id) {
      return res.status(400).json({
          status: 'error',
        error: 'section_name or section_id is required'
      });
    }

    let query = supabaseAdmin
          .from('students')
      .select('id, registration_number, name, section_id');

    if (section_id) {
      query = query.eq('section_id', section_id);
    } else if (section_name) {
      // First get the section ID
      const { data: section, error: sectionError } = await supabaseAdmin
        .from('sections')
        .select('id')
        .eq('name', section_name)
        .maybeSingle();

      if (sectionError) throw sectionError;
      if (!section) {
        return res.status(404).json({
          status: 'error',
          error: `Section "${section_name}" not found`
        });
      }

      query = query.eq('section_id', section.id);
    }

    const { data: students, error: studentsError } = await query.order('registration_number');

    if (studentsError) throw studentsError;

    return res.status(200).json({
      status: 'ok',
      students: students || []
    });
  } catch (error) {
    console.error('[GroupGrid API] getStudents error:', error);
    return res.status(500).json({
          status: 'error',
      error: error.message
    });
      }
}

/**
 * Update a group
 * Accepts: group_id, title, members (array of {registration_number, name})
 */
async function updateGroup(req, res) {
  try {
    const { group_id, title, members } = req.body;

    if (!group_id) {
      return res.status(400).json({
        status: 'error',
        error: 'Group ID is required'
      });
    }

    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        status: 'error',
        error: 'At least one member is required'
      });
    }

    // Get group and formation to verify it exists
    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .select(`
        *,
        group_formations!inner (
          id,
          section_id
        )
      `)
      .eq('id', group_id)
      .maybeSingle();

    if (groupError) throw groupError;
    if (!group) {
      return res.status(404).json({
        status: 'error',
        error: 'Group not found'
      });
    }

    const formation = group.group_formations;
    if (!formation) {
      return res.status(404).json({
        status: 'error',
        error: 'Formation not found for this group'
      });
    }

    // Extract group number and custom title from formatted title if needed
    let groupNumber = req.body.group_number ? parseInt(req.body.group_number) : null;
    let customTitle = title?.trim() || null;
    
    // If title is formatted as "Group X - Title", extract both
    if (title && title.match(/^Group\s+\d+/i)) {
      const numberMatch = title.match(/^Group\s+(\d+)/i);
      if (numberMatch) {
        groupNumber = parseInt(numberMatch[1]);
        const titleMatch = title.match(/^Group\s+\d+\s*-\s*(.+)$/i);
        customTitle = titleMatch ? titleMatch[1].trim() : null;
      }
    }
    
    // If group_number is provided separately, use it
    if (req.body.group_number !== undefined) {
      groupNumber = parseInt(req.body.group_number);
    }
    
    // Update group with separate group_number and title fields
    const updateData = {};
    if (groupNumber !== null) {
      updateData.group_number = groupNumber;
    }
    if (customTitle !== undefined) {
      updateData.title = customTitle;
    }
    
    const { data: updatedGroup, error: updateError } = await supabaseAdmin
      .from('groups')
        .update(updateData)
      .eq('id', group_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Delete existing student members
    const { error: deleteError } = await supabaseAdmin
      .from('group_student_members')
      .delete()
      .eq('group_id', group_id);

    if (deleteError) throw deleteError;

    // Look up students by registration numbers
    const registrationNumbers = members.map(m => {
      if (typeof m === 'string') {
        return m.trim();
      } else if (m && m.registration_number) {
        return m.registration_number.trim();
      }
      return null;
    }).filter(Boolean);

    if (registrationNumbers.length === 0) {
      return res.status(400).json({
        status: 'error',
        error: 'No valid registration numbers provided'
      });
    }

    // Fetch students by registration numbers from the formation's section
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('id, registration_number, name')
      .eq('section_id', formation.section_id)
      .in('registration_number', registrationNumbers);

    if (studentsError) throw studentsError;

    if (students.length !== registrationNumbers.length) {
      const foundRegNumbers = students.map(s => s.registration_number);
      const missing = registrationNumbers.filter(reg => !foundRegNumbers.includes(reg));
      return res.status(400).json({
        status: 'error',
        error: `Some students not found: ${missing.join(', ')}`
      });
    }

    // Insert updated student members
    const studentMemberInserts = students.map(student => ({
      group_id: group_id,
      student_id: student.id,
      registration_number: student.registration_number,
      name: student.name
    }));

    const { data: insertedStudentMembers, error: studentMembersError } = await supabaseAdmin
      .from('group_student_members')
      .insert(studentMemberInserts)
      .select();

    if (studentMembersError) {
      console.error('[GroupGrid API] Error inserting student members (update):', studentMembersError);
      if (studentMembersError.code === '42P01' || studentMembersError.message?.includes('does not exist')) {
        throw new Error('group_student_members table does not exist. Please run migration 015_add_group_student_members.sql');
      }
      throw studentMembersError;
    }

    console.log('[GroupGrid API] Successfully updated', insertedStudentMembers.length, 'student members');

    return res.status(200).json({
        status: 'ok',
      group: {
        ...updatedGroup,
        member_count: insertedStudentMembers.length,
        student_members: insertedStudentMembers
      }
    });
  } catch (error) {
    console.error('[GroupGrid API] updateGroup error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
}

/**
 * Delete a group
 */
async function deleteGroup(req, res) {
  try {
    const { group_id } = req.body;

    if (!group_id) {
      return res.status(400).json({
          status: 'error',
        error: 'Group ID is required'
      });
    }

    // Check if group exists
    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .select('id')
      .eq('id', group_id)
      .maybeSingle();

    if (groupError) throw groupError;
    if (!group) {
      return res.status(404).json({
          status: 'error',
        error: 'Group not found'
      });
    }

    // Delete the group (CASCADE will delete related members)
    const { error: deleteError } = await supabaseAdmin
      .from('groups')
      .delete()
      .eq('id', group_id);

    if (deleteError) throw deleteError;

    console.log(`[GroupGrid API] ✓ Deleted group ${group_id}`);

    return res.status(200).json({
      status: 'ok',
      message: 'Group deleted successfully'
    });

  } catch (error) {
    console.error('[GroupGrid API] deleteGroup error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message || 'Failed to delete group'
    });
  }
}

/**
 * Legacy endpoint: Get all pool data (aggregates, entries, suggestions)
 * GET /api/groupgrid
 */
async function handleLegacyGetAll(req, res) {
  try {
    // Check if legacy table exists
    const tableName = 'groupgrid_entries';
    
    // Get all entries
    const { data: entries, error: entriesError } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (entriesError) {
      // If table doesn't exist, return empty data
      if (entriesError.code === '42P01' || entriesError.message?.includes('does not exist')) {
        console.warn('[GroupGrid API] Legacy table does not exist, returning empty data');
        return res.status(200).json({
          status: 'ok',
          aggregates: {
            slotD: {},
            slotA: {},
            openG: {},
            sections: {}
          },
          entries: [],
          suggestions: {
            slotD: [],
            slotA: [],
            openG: [],
            sections: []
          }
        });
      }
      throw entriesError;
    }

    // Calculate aggregates
    const aggregates = {
      slotD: {},
      slotA: {},
      openG: {},
      sections: {}
    };

    const suggestions = {
      slotD: new Set(),
      slotA: new Set(),
      openG: new Set(),
      sections: new Set()
    };

    (entries || []).forEach(entry => {
      // Count by slot
      if (entry.slot_d) {
        aggregates.slotD[entry.slot_d] = (aggregates.slotD[entry.slot_d] || 0) + 1;
        suggestions.slotD.add(entry.slot_d);
      }
      if (entry.slot_a) {
        aggregates.slotA[entry.slot_a] = (aggregates.slotA[entry.slot_a] || 0) + 1;
        suggestions.slotA.add(entry.slot_a);
      }
      if (entry.open_g) {
        aggregates.openG[entry.open_g] = (aggregates.openG[entry.open_g] || 0) + 1;
        suggestions.openG.add(entry.open_g);
      }
      if (entry.section) {
        aggregates.sections[entry.section] = (aggregates.sections[entry.section] || 0) + 1;
        suggestions.sections.add(entry.section);
      }
    });

    // Format entries for frontend
    const formattedEntries = (entries || []).map(entry => ({
      registerNumber: entry.register_number,
      section: entry.section,
      slotD: entry.slot_d,
      slotA: entry.slot_a,
      openG: entry.open_g,
      name: entry.name || null
    }));

    return res.status(200).json({
        status: 'ok',
      aggregates,
      entries: formattedEntries,
      suggestions: {
        slotD: Array.from(suggestions.slotD).sort(),
        slotA: Array.from(suggestions.slotA).sort(),
        openG: Array.from(suggestions.openG).sort(),
        sections: Array.from(suggestions.sections).sort()
      }
    });
  } catch (error) {
    console.error('[GroupGrid API] handleLegacyGetAll error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message || 'Failed to fetch pool data'
    });
  }
}

/**
 * Legacy endpoint: Get pool data for specific RA
 * GET /api/groupgrid?ra=RA...
 */
async function handleLegacyGetByRA(req, res, ra) {
  try {
    const tableName = 'groupgrid_entries';
    const normalizedRA = (ra || '').toUpperCase().trim();

    // Get all entries (for aggregates)
    const { data: allEntries, error: allEntriesError } = await supabaseAdmin
      .from(tableName)
      .select('*');

    if (allEntriesError && allEntriesError.code !== '42P01') {
      throw allEntriesError;
    }

    // Get specific entry
    let entry = null;
    if (normalizedRA) {
      const { data: entryData, error: entryError } = await supabaseAdmin
        .from(tableName)
        .select('*')
        .eq('register_number', normalizedRA)
        .maybeSingle();

      if (entryError && entryError.code !== '42P01') {
        throw entryError;
      }

      if (entryData) {
        entry = {
          registerNumber: entryData.register_number,
          section: entryData.section,
          slotD: entryData.slot_d,
          slotA: entryData.slot_a,
          openG: entryData.open_g
        };
      }
    }

    // Get student name from students table
    let studentName = null;
    if (normalizedRA) {
      const { data: student, error: studentError } = await supabaseAdmin
        .from('students')
        .select('name')
        .eq('registration_number', normalizedRA)
        .maybeSingle();

      if (studentError && studentError.code !== '42P01') {
        console.warn('[GroupGrid API] Error fetching student name:', studentError);
      } else if (student) {
        studentName = student.name;
      }
    }

    // Calculate aggregates from all entries
    const aggregates = {
      slotD: {},
      slotA: {},
      openG: {},
      sections: {}
    };

    const suggestions = {
      slotD: new Set(),
      slotA: new Set(),
      openG: new Set(),
      sections: new Set()
    };

    (allEntries || []).forEach(e => {
      if (e.slot_d) {
        aggregates.slotD[e.slot_d] = (aggregates.slotD[e.slot_d] || 0) + 1;
        suggestions.slotD.add(e.slot_d);
      }
      if (e.slot_a) {
        aggregates.slotA[e.slot_a] = (aggregates.slotA[e.slot_a] || 0) + 1;
        suggestions.slotA.add(e.slot_a);
      }
      if (e.open_g) {
        aggregates.openG[e.open_g] = (aggregates.openG[e.open_g] || 0) + 1;
        suggestions.openG.add(e.open_g);
      }
      if (e.section) {
        aggregates.sections[e.section] = (aggregates.sections[e.section] || 0) + 1;
        suggestions.sections.add(e.section);
      }
    });

    // Format entries
    const formattedEntries = (allEntries || []).map(e => ({
      registerNumber: e.register_number,
      section: e.section,
      slotD: e.slot_d,
      slotA: e.slot_a,
      openG: e.open_g,
      name: e.name || null
    }));

    return res.status(200).json({
      status: 'ok',
      aggregates,
      entries: formattedEntries,
      suggestions: {
        slotD: Array.from(suggestions.slotD).sort(),
        slotA: Array.from(suggestions.slotA).sort(),
        openG: Array.from(suggestions.openG).sort(),
        sections: Array.from(suggestions.sections).sort()
      },
      entry: entry,
      studentName: studentName
    });
  } catch (error) {
    console.error('[GroupGrid API] handleLegacyGetByRA error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message || 'Failed to fetch pool data'
    });
  }
}

/**
 * Legacy endpoint: Create or update entry
 * POST /api/groupgrid
 */
async function handleLegacyPost(req, res) {
  try {
    const { registerNumber, section, slotD, slotA, openG } = req.body;

    if (!registerNumber || !section) {
      return res.status(400).json({
        status: 'error',
        error: 'Register number and section are required'
      });
    }

    const tableName = 'groupgrid_entries';
    const normalizedRA = registerNumber.toUpperCase().trim();

    // Upsert entry
    const { data: entry, error: upsertError } = await supabaseAdmin
      .from(tableName)
      .upsert({
        register_number: normalizedRA,
        section: section.trim().toUpperCase(),
        slot_d: slotD || null,
        slot_a: slotA || null,
        open_g: openG || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'register_number'
      })
      .select()
      .single();

    if (upsertError) {
      // If table doesn't exist, return helpful error
      if (upsertError.code === '42P01' || upsertError.message?.includes('does not exist')) {
        return res.status(500).json({
          status: 'error',
          error: 'GroupGrid pool table does not exist. Please create the groupgrid_entries table in Supabase.'
        });
      }
      throw upsertError;
    }

    return res.status(200).json({
      status: 'ok',
      entry: {
        registerNumber: entry.register_number,
        section: entry.section,
        slotD: entry.slot_d,
        slotA: entry.slot_a,
        openG: entry.open_g
      }
    });
  } catch (error) {
    console.error('[GroupGrid API] handleLegacyPost error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message || 'Failed to save entry'
    });
  }
}

/**
 * Legacy endpoint: Update entry
 * PATCH /api/groupgrid
 */
async function handleLegacyPatch(req, res) {
  try {
    const { registerNumber, section, slotD, slotA, openG } = req.body;

    if (!registerNumber) {
      return res.status(400).json({
        status: 'error',
        error: 'Register number is required'
      });
    }

    const tableName = 'groupgrid_entries';
    const normalizedRA = registerNumber.toUpperCase().trim();

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (section !== undefined) updateData.section = section.trim().toUpperCase();
    if (slotD !== undefined) updateData.slot_d = slotD || null;
    if (slotA !== undefined) updateData.slot_a = slotA || null;
    if (openG !== undefined) updateData.open_g = openG || null;

    const { data: entry, error: updateError } = await supabaseAdmin
      .from(tableName)
      .update(updateData)
      .eq('register_number', normalizedRA)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === '42P01' || updateError.message?.includes('does not exist')) {
        return res.status(500).json({
          status: 'error',
          error: 'GroupGrid pool table does not exist. Please create the groupgrid_entries table in Supabase.'
        });
      }
      if (updateError.code === 'PGRST116') {
        return res.status(404).json({
          status: 'error',
          error: 'Entry not found'
        });
      }
      throw updateError;
    }

    return res.status(200).json({
      status: 'ok',
      entry: {
        registerNumber: entry.register_number,
        section: entry.section,
        slotD: entry.slot_d,
        slotA: entry.slot_a,
        openG: entry.open_g
      }
    });
  } catch (error) {
    console.error('[GroupGrid API] handleLegacyPatch error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message || 'Failed to update entry'
    });
  }
}
