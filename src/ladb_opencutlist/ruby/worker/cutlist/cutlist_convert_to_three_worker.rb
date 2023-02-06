module Ladb::OpenCutList

  require_relative '../../helper/layer_visibility_helper'
  require_relative '../../helper/hashable_helper'

  class CutlistConvertToThreeWorker

    include LayerVisibilityHelper

    def initialize(parts, all_instances = false)

      @part = parts
      @all_instances = all_instances

    end

    # -----

    def run

      model = Sketchup.active_model
      return nil unless model

      materials = model.materials

      three_model_def = ThreeModelDef.new

      @part.each do |part|

        if @all_instances

          part.def.instance_infos.each { |serialized_path, instance_info|

            three_part_def = ThreePartDef.new
            three_part_def.number = part.number
            three_model_def.add(three_part_def)

            _populate_three_object_def(three_part_def, instance_info.entity.definition)

            three_part_def.matrix = _to_three_matrix(instance_info.transformation)
            three_part_def.color = _to_three_color(materials[part.material_name])

          }

        else

          instance_info = part.def.instance_infos.values.first

          three_part_def = ThreePartDef.new
          three_model_def.add(three_part_def)

          _populate_three_object_def(three_part_def, instance_info.entity.definition)

          three_part_def.matrix = _to_three_matrix(Geom::Transformation.scaling(part.def.scale.x * (part.def.flipped ? -1 : 1), part.def.scale.y, part.def.scale.z))
          three_part_def.color = _to_three_color(materials[part.def.material_name])

        end

      end

      three_model_def
    end

    # -----

    def _populate_three_object_def(three_object_def, entity)
      return if entity.is_a?(Sketchup::Edge)   # Minor Speed imrovement when there's a lot of edges

      if entity.is_a?(Sketchup::Face)

        return unless entity.visible? && _layer_visible?(entity.layer)

        mesh = entity.mesh

        three_mesh_def = ThreeMeshDef.new
        three_mesh_def.color = _to_three_color(entity.material)
        three_mesh_def.vertices = mesh.polygons.map { |polygon|
          polygon.map { |index|
            point = mesh.point_at(index)
            [ point.x.to_f, point.y.to_f, point.z.to_f ]
          }.flatten
        }.flatten

        three_object_def.add(three_mesh_def)

      elsif entity.is_a?(Sketchup::Group)

        return unless entity.visible? && _layer_visible?(entity.layer)

        three_group_def = ThreeGroupDef.new
        three_group_def.matrix = _to_three_matrix(entity.transformation)
        three_group_def.color = _to_three_color(entity.material)

        three_object_def.add(three_group_def)

        entity.entities.each do |child_entity|
          _populate_three_object_def(three_group_def, child_entity)
        end

      elsif entity.is_a?(Sketchup::ComponentInstance)

        # return unless entity.visible? && _layer_visible?(entity.layer)
        #
        # three_group_def = ThreeGroupDef.new
        # three_group_def.matrix = _to_three_matrix(entity.transformation)
        # three_group_def.color = _to_three_color(entity.material)
        #
        # three_object_def.add(three_group_def)
        #
        # entity.definition.entities.each do |child_entity|
        #   _populate_three_object_def(three_group_def, child_entity)
        # end

      elsif entity.is_a?(Sketchup::ComponentDefinition)

        entity.entities.each do |child_entity|
          _populate_three_object_def(three_object_def, child_entity)
        end

      elsif entity.is_a?(Sketchup::Model)

        entity.entities.each do |child_entity|
          _populate_three_object_def(three_object_def, child_entity)
        end

      end

    end

    def _to_three_matrix(tranformation)
      return nil unless tranformation.is_a?(Geom::Transformation)
      return nil if tranformation.identity?
      tranformation.to_a.flatten
    end

    def _to_three_color(material)
      return nil unless material.is_a?(Sketchup::Material)
      (material.color.red << 16) + (material.color.green << 8) + material.color.blue
    end

  end

  # -----

  class ThreeObjectDef

    include HashableHelper

    TYPE_UNDEFINED = 0
    TYPE_MODEL = 1
    TYPE_PART = 2
    TYPE_GROUP = 3
    TYPE_MESH = 4

    attr_accessor :color

    def initialize(type = TYPE_UNDEFINED)
      @type = type
      @color = nil
    end

    def type
      @type
    end

  end

  class ThreeGroupDef < ThreeObjectDef

    attr_accessor :matrix
    attr_reader :children

    def initialize(type = ThreeObjectDef::TYPE_GROUP)
      super(type)
      @matrix = nil
      @children = []
    end

    def add(three_object)
      @children.push(three_object)
    end

  end

  class ThreeModelDef < ThreeGroupDef

    attr_accessor :up

    def initialize
      super(ThreeObjectDef::TYPE_MODEL)
      @up = [ 0, 0, 1 ]
    end

  end

  class ThreePartDef < ThreeGroupDef

    attr_accessor :number

    def initialize
      super(ThreeObjectDef::TYPE_PART)
      @number = nil
    end

  end

  class ThreeMeshDef < ThreeObjectDef

    attr_accessor :vertices

    def initialize
      super(ThreeObjectDef::TYPE_MESH)
      @vertices = []
    end

  end

end