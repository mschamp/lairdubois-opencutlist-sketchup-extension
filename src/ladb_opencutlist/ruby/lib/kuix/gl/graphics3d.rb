module Ladb::OpenCutList::Kuix

  class Graphics3d < Graphics

    def initialize(view)
      super(view)
    end

    # -- Drawing --

    def draw_lines(points, color = nil, line_width = nil, line_stipple = nil)
      set_drawing_color(color) if color
      set_line_width(line_width) if line_width
      set_line_stipple(line_stipple) if line_stipple
      @view.draw_lines(points)
    end

    def draw_line_strip(points, color = nil, line_width = nil, line_stipple = nil)
      set_drawing_color(color) if color
      set_line_width(line_width) if line_width
      set_line_stipple(line_stipple) if line_stipple
      @view.draw(GL_LINE_STRIP, points)
    end

    def draw_line_loop(points, color = nil, line_width = nil, line_stipple = nil)
      set_drawing_color(color) if color
      set_line_width(line_width) if line_width
      set_line_stipple(line_stipple) if line_stipple
      @view.draw(GL_LINE_LOOP, points)
    end

    def draw_triangles(points, background_color = nil)
      set_drawing_color(background_color) if background_color
      @view.draw(GL_TRIANGLES, points)
    end

  end

end